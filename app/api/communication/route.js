import { NextResponse } from "next/server";
import {
  query,
  queryOne,
  queryRows,
  serializeAnnouncement
} from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  GROUP_CONVERSATION_ID,
  getDirectConversationId,
  isUserOnline,
  serializeTimestamp
} from "@/lib/communication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCurrentUserPayload(session) {
  return {
    id: Number(session.user.id),
    name: session.user.name,
    role: session.user.role,
    email: session.user.email || null
  };
}

function createPreview(body) {
  const text = body?.trim();

  if (!text) {
    return "No messages yet.";
  }

  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
}

async function touchPresence(userId, client) {
  await query(
    `
      INSERT INTO user_presence (user_id, last_seen_at)
      VALUES ($1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
    `,
    [userId],
    client
  );
}

export async function GET() {
  const { session, response } = await requireSession();

  if (response) {
    return response;
  }

  const currentUserId = Number(session.user.id);
  await touchPresence(currentUserId);

  const [announcements, users, latestGroupMessage] = await Promise.all([
    queryRows(
      `
        SELECT
          a.id,
          a.title,
          a.message,
          a.created_by,
          a.created_at,
          u.full_name AS created_by_name
        FROM announcements a
        LEFT JOIN users u ON u.id = a.created_by
        ORDER BY a.created_at DESC
        LIMIT 5
      `
    ),
    queryRows(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          up.last_seen_at,
          latest.body AS latest_body,
          latest.created_at AS latest_created_at
        FROM users u
        LEFT JOIN user_presence up ON up.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT body, created_at
          FROM chat_messages m
          WHERE m.conversation_type = 'direct'
            AND (
              (m.sender_id = $1 AND m.recipient_user_id = u.id) OR
              (m.sender_id = u.id AND m.recipient_user_id = $1)
            )
          ORDER BY m.created_at DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE u.is_active = TRUE
          AND u.id != $1
        ORDER BY
          CASE WHEN latest.created_at IS NULL THEN 1 ELSE 0 END,
          latest.created_at DESC NULLS LAST,
          LOWER(u.full_name) ASC
      `,
      [currentUserId]
    ),
    queryOne(
      `
        SELECT
          m.body,
          m.created_at,
          u.full_name AS sender_name
        FROM chat_messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_type = 'group'
        ORDER BY m.created_at DESC
        LIMIT 1
      `
    )
  ]);

  const directConversations = users.map((user) => ({
    conversation_id: getDirectConversationId(user.id),
    type: "direct",
    user_id: Number(user.id),
    label: user.full_name,
    email: user.email,
    role: user.role,
    is_online: isUserOnline(user.last_seen_at),
    last_seen_at: serializeTimestamp(user.last_seen_at),
    preview: createPreview(user.latest_body),
    last_message_at: serializeTimestamp(user.latest_created_at)
  }));

  const onlineCount =
    directConversations.filter((conversation) => conversation.is_online).length + 1;

  const conversations = [
    {
      conversation_id: GROUP_CONVERSATION_ID,
      type: "group",
      label: "Team Chat",
      description: `${onlineCount} online now`,
      is_online: true,
      preview: latestGroupMessage
        ? createPreview(
            `${latestGroupMessage.sender_name}: ${latestGroupMessage.body}`
          )
        : "Start the conversation.",
      last_message_at: serializeTimestamp(latestGroupMessage?.created_at)
    },
    ...directConversations
  ];

  return NextResponse.json({
    currentUser: getCurrentUserPayload(session),
    conversations,
    announcements: announcements.map(serializeAnnouncement)
  });
}

export async function POST(request) {
  const { session, response } = await requireSession();

  if (response) {
    return response;
  }

  try {
    const currentUserId = Number(session.user.id);
    const body = await request.json();
    const conversationType =
      body.conversationType === "direct" ? "direct" : "group";
    const messageBody = body.body?.trim();
    const recipientUserId =
      conversationType === "direct" ? Number(body.recipientUserId) : null;

    if (!messageBody) {
      return NextResponse.json(
        { message: "Message cannot be empty." },
        { status: 400 }
      );
    }

    if (messageBody.length > 1500) {
      return NextResponse.json(
        { message: "Message is too long." },
        { status: 400 }
      );
    }

    if (conversationType === "direct") {
      if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) {
        return NextResponse.json(
          { message: "Choose a valid recipient." },
          { status: 400 }
        );
      }

      if (recipientUserId === currentUserId) {
        return NextResponse.json(
          { message: "You cannot message yourself." },
          { status: 400 }
        );
      }

      const recipient = await queryOne(
        `
          SELECT id
          FROM users
          WHERE id = $1
            AND is_active = TRUE
        `,
        [recipientUserId]
      );

      if (!recipient) {
        return NextResponse.json(
          { message: "Recipient not found." },
          { status: 404 }
        );
      }
    }

    await touchPresence(currentUserId);

    const message = await queryOne(
      `
        INSERT INTO chat_messages (
          sender_id,
          recipient_user_id,
          conversation_type,
          body,
          created_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, sender_id, recipient_user_id, conversation_type, body, created_at
      `,
      [currentUserId, recipientUserId, conversationType, messageBody]
    );

    return NextResponse.json(
      {
        message: "Message sent successfully.",
        sentMessage: {
          ...message,
          id: Number(message.id),
          sender_id: Number(message.sender_id),
          recipient_user_id: message.recipient_user_id
            ? Number(message.recipient_user_id)
            : null,
          created_at: serializeTimestamp(message.created_at)
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to send message." },
      { status: 500 }
    );
  }
}
