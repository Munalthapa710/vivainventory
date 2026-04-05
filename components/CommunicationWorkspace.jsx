"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Megaphone, MessageSquare, Send, Users } from "lucide-react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import {
  apiRequest,
  formatDate,
  formatRelativeTime
} from "@/lib/client";
import { GROUP_CONVERSATION_ID } from "@/lib/communication";

const initialAnnouncement = {
  title: "",
  message: ""
};

function parseDirectUserId(conversationId) {
  if (!conversationId?.startsWith("direct:")) {
    return null;
  }

  const userId = Number(conversationId.split(":")[1]);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getConversationPresence(conversation) {
  if (!conversation) {
    return "";
  }

  if (conversation.type === "group") {
    return conversation.description || "Group conversation";
  }

  if (conversation.is_online) {
    return "Active now";
  }

  if (conversation.last_seen_at) {
    return `Active ${formatRelativeTime(conversation.last_seen_at)}`;
  }

  return conversation.role || "Team member";
}

function getConversationPreview(conversation) {
  if (!conversation) {
    return "";
  }

  if (conversation.type === "group") {
    return conversation.preview || "Message the full team.";
  }

  return conversation.preview || conversation.email || "Start a direct chat.";
}

function ConversationButton({ conversation, isSelected, onClick }) {
  const hasRecentMessage = Boolean(conversation.last_message_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-3xl border px-4 py-4 text-left transition",
        isSelected
          ? "border-orange-200 bg-orange-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {conversation.type === "direct" ? (
              <span
                className={[
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  conversation.is_online ? "bg-emerald-500" : "bg-slate-300"
                ].join(" ")}
              />
            ) : (
              <div className="rounded-full bg-orange-100 p-1 text-orange-600">
                <Users className="h-3.5 w-3.5" />
              </div>
            )}
            <p className="truncate font-semibold text-slate-900">
              {conversation.label}
            </p>
          </div>
          <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-slate-400">
            {getConversationPresence(conversation)}
          </p>
        </div>
        <p className="shrink-0 text-[11px] font-medium text-slate-400">
          {hasRecentMessage ? formatRelativeTime(conversation.last_message_at) : ""}
        </p>
      </div>
      <p className="mt-3 truncate text-sm text-slate-500">
        {getConversationPreview(conversation)}
      </p>
    </button>
  );
}

function MessageBubble({ message, showSender }) {
  return (
    <div className={message.is_mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[88%] rounded-[1.6rem] px-4 py-3 shadow-sm",
          message.is_mine
            ? "bg-orange-500 text-white"
            : "border border-slate-200 bg-slate-50 text-slate-900"
        ].join(" ")}
      >
        {showSender ? (
          <p
            className={[
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              message.is_mine ? "text-orange-100" : "text-slate-400"
            ].join(" ")}
          >
            {message.sender_name}
          </p>
        ) : null}
        <p
          className={[
            "whitespace-pre-wrap break-words text-sm leading-6",
            showSender ? "mt-2" : ""
          ].join(" ")}
        >
          {message.body}
        </p>
        <p
          className={[
            "mt-2 text-[11px]",
            message.is_mine ? "text-orange-100" : "text-slate-400"
          ].join(" ")}
        >
          {formatDate(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function CommunicationWorkspace({
  eyebrow = "Communication",
  title = "Team chat",
  description = "Message the full team, open direct conversations, and keep announcements visible in one workspace."
}) {
  const maxMessageLength = 1500;
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedConversationDetails, setSelectedConversationDetails] =
    useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [conversationQuery, setConversationQuery] = useState("");
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncement);
  const messagesRequestRef = useRef(0);
  const messagesEndRef = useRef(null);
  const mountedRef = useRef(true);

  async function loadOverview({ silent = false } = {}) {
    try {
      const data = await apiRequest("/api/communication");

      if (!mountedRef.current) {
        return;
      }

      setCurrentUser(data.currentUser);
      setConversations(data.conversations || []);
      setAnnouncements(data.announcements || []);
      setSelectedConversationId((current) => {
        const fallbackId = data.conversations?.[0]?.conversation_id || null;

        if (!current) {
          return fallbackId;
        }

        return data.conversations?.some(
          (conversation) => conversation.conversation_id === current
        )
          ? current
          : fallbackId;
      });
    } catch (error) {
      if (!silent) {
        toast.error(error.message || "Unable to load communication.");
      }
    }
  }

  async function loadMessages(conversationId, { silent = false, showSpinner = false } = {}) {
    if (!conversationId) {
      return;
    }

    const requestId = messagesRequestRef.current + 1;
    messagesRequestRef.current = requestId;

    if (showSpinner) {
      setMessagesLoading(true);
    }

    try {
      const directUserId = parseDirectUserId(conversationId);
      const query =
        conversationId === GROUP_CONVERSATION_ID
          ? "/api/communication/messages?conversationType=group"
          : `/api/communication/messages?conversationType=direct&userId=${directUserId}`;
      const data = await apiRequest(query);

      if (!mountedRef.current || messagesRequestRef.current !== requestId) {
        return;
      }

      setSelectedConversationDetails(data.conversation);
      setMessages(data.messages || []);
    } catch (error) {
      if (!silent) {
        toast.error(error.message || "Unable to load messages.");
      }
    } finally {
      if (
        showSpinner &&
        mountedRef.current &&
        messagesRequestRef.current === requestId
      ) {
        setMessagesLoading(false);
      }
    }
  }

  async function sendMessage() {
    const messageBody = draft.trim();

    if (!messageBody || !selectedConversationId) {
      return;
    }

    setSending(true);

    try {
      const directUserId =
        selectedConversationId === GROUP_CONVERSATION_ID
          ? null
          : parseDirectUserId(selectedConversationId);

      await apiRequest("/api/communication", {
        method: "POST",
        body: JSON.stringify({
          conversationType:
            selectedConversationId === GROUP_CONVERSATION_ID ? "group" : "direct",
          recipientUserId: directUserId,
          body: messageBody
        })
      });

      setDraft("");
      await Promise.all([
        loadOverview({ silent: true }),
        loadMessages(selectedConversationId, { silent: true })
      ]);
    } catch (error) {
      toast.error(error.message || "Unable to send message.");
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  }

  async function postAnnouncement(event) {
    event.preventDefault();
    setPostingAnnouncement(true);

    try {
      await apiRequest("/api/announcements", {
        method: "POST",
        body: JSON.stringify(announcementForm)
      });

      toast.success("Announcement posted.");
      setAnnouncementForm(initialAnnouncement);
      await loadOverview({ silent: true });
    } catch (error) {
      toast.error(error.message || "Unable to post announcement.");
    } finally {
      if (mountedRef.current) {
        setPostingAnnouncement(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    async function initialise() {
      await loadOverview();

      if (mountedRef.current) {
        setLoading(false);
      }
    }

    initialise();

    const intervalId = window.setInterval(() => {
      void loadOverview({ silent: true });
    }, 10000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setSelectedConversationDetails(null);
      setDraft("");
      return;
    }

    setMessages([]);
    setSelectedConversationDetails(null);
    setDraft("");
    void loadMessages(selectedConversationId, {
      showSpinner: true
    });
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadMessages(selectedConversationId, { silent: true });
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages.length, selectedConversationId]);

  if (loading) {
    return <LoadingSkeleton cards={3} rows={6} />;
  }

  const selectedConversation =
    selectedConversationDetails ||
    conversations.find(
      (conversation) => conversation.conversation_id === selectedConversationId
    ) ||
    null;
  const groupConversation =
    conversations.find(
      (conversation) => conversation.conversation_id === GROUP_CONVERSATION_ID
    ) || null;
  const directConversations = conversations.filter(
    (conversation) => conversation.type === "direct"
  );
  const normalizedConversationQuery = conversationQuery.trim().toLowerCase();
  const filteredDirectConversations = directConversations.filter((conversation) =>
    [conversation.label, conversation.email, conversation.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedConversationQuery)
  );
  const onlineCount = directConversations.filter(
    (conversation) => conversation.is_online
  ).length + (currentUser ? 1 : 0);
  const showSenderName = selectedConversation?.type === "group";
  const remainingCharacters = maxMessageLength - draft.length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Online now
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{onlineCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Direct chats
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {directConversations.length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Notices
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {announcements.length}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className="card-panel flex min-h-[680px] flex-col">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Conversations
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Team list
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Green dot means the person is active on the communication page.
            </p>
          </div>

          {groupConversation ? (
            <div className="mb-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Everyone
              </p>
              <ConversationButton
                conversation={groupConversation}
                isSelected={
                  groupConversation.conversation_id === selectedConversationId
                }
                onClick={() =>
                  setSelectedConversationId(groupConversation.conversation_id)
                }
              />
            </div>
          ) : null}

          <div className="mb-4">
            <label className="label">Search direct chat</label>
            <input
              className="input"
              value={conversationQuery}
              onChange={(event) => setConversationQuery(event.target.value)}
              placeholder="Search by name or email"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Direct messages
            </p>

            {filteredDirectConversations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No direct conversations match this search.
              </div>
            ) : (
              filteredDirectConversations.map((conversation) => (
                <ConversationButton
                  key={conversation.conversation_id}
                  conversation={conversation}
                  isSelected={
                    conversation.conversation_id === selectedConversationId
                  }
                  onClick={() =>
                    setSelectedConversationId(conversation.conversation_id)
                  }
                />
              ))
            )}
          </div>
        </aside>

        <section className="card-panel flex min-h-[680px] flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="border-b border-slate-200 pb-5">
                <div className="flex items-start gap-3">
                  {selectedConversation.type === "direct" ? (
                    <span
                      className={[
                        "mt-2 h-3 w-3 shrink-0 rounded-full",
                        selectedConversation.is_online
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      ].join(" ")}
                    />
                  ) : (
                    <div className="rounded-2xl bg-orange-100 p-3 text-orange-600">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedConversation.label}
                      </h2>
                      <span className="badge-neutral">
                        {selectedConversation.type === "group"
                          ? "Everyone"
                          : selectedConversation.role || "Direct"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {getConversationPresence(selectedConversation)}
                    </p>
                    {selectedConversation.email ? (
                      <p className="mt-1 break-all text-sm text-slate-400">
                        {selectedConversation.email}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="no-scrollbar mt-5 flex-1 overflow-y-auto pr-1">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                      <p className="text-base font-semibold text-slate-900">
                        No messages yet
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Start the conversation from the chat box below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        showSender={showSenderName || !message.is_mine}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                className="mt-5 border-t border-slate-200 pt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <label className="label">Message</label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <textarea
                    className="input min-h-24 resize-none"
                    placeholder={`Message ${selectedConversation.label}`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={maxMessageLength}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();

                        if (!sending && draft.trim()) {
                          void sendMessage();
                        }
                      }
                    }}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto"
                    disabled={sending || !draft.trim()}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <p>Press Enter to send. Use Shift+Enter for a new line.</p>
                  <p>{remainingCharacters} characters left</p>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  No conversations available
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Active team members will appear here when accounts exist.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {currentUser?.role === "admin" ? (
            <section className="card-panel">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                  Admin Notice
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Post announcement
                </h2>
              </div>

              <form className="space-y-4" onSubmit={postAnnouncement}>
                <div>
                  <label className="label">Title</label>
                  <input
                    className="input"
                    value={announcementForm.title}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    placeholder="Dispatch update"
                    required
                    disabled={postingAnnouncement}
                  />
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea
                    className="input min-h-28 resize-none"
                    value={announcementForm.message}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        message: event.target.value
                      }))
                    }
                    placeholder="Share important notices with the team."
                    required
                    disabled={postingAnnouncement}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={postingAnnouncement}
                >
                  {postingAnnouncement ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" />
                      Post announcement
                    </>
                  )}
                </button>
              </form>
            </section>
          ) : null}

          <section className="card-panel">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                Announcements
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Team updates
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Latest notices stay visible beside the chat.
              </p>
            </div>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No announcements available.
                </div>
              ) : (
                announcements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-2 text-orange-500">
                      <Megaphone className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                        {formatDate(announcement.created_at)}
                      </p>
                    </div>
                    <h3 className="mt-3 break-words text-base font-bold text-slate-900">
                      {announcement.title}
                    </h3>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                      {announcement.message}
                    </p>
                    {announcement.created_by_name ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Posted by {announcement.created_by_name}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
