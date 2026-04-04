"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Megaphone,
  ShieldAlert
} from "lucide-react";
import { apiRequest, formatRelativeTime } from "@/lib/client";

function getNotificationIcon(type) {
  switch (type) {
    case "security":
      return ShieldAlert;
    case "announcement":
      return Megaphone;
    case "low_stock":
      return AlertTriangle;
    default:
      return Activity;
  }
}

function getNotificationAccent(type) {
  switch (type) {
    case "security":
      return "bg-rose-50 text-rose-600";
    case "announcement":
      return "bg-indigo-50 text-indigo-600";
    case "low_stock":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-emerald-50 text-emerald-600";
  }
}

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const panelRef = useRef(null);
  const storageKey = `vivainventory.notifications.lastSeen.${user.id}`;

  async function loadNotifications() {
    try {
      const data = await apiRequest("/api/notifications");
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();

    const refreshId = window.setInterval(loadNotifications, 60000);

    return () => {
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      setLastSeenAt(storedValue ? Number(storedValue) : 0);
    } catch {
      setLastSeenAt(0);
    }
  }, [storageKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const latestCreatedAt = notifications[0]?.created_at
    ? new Date(notifications[0].created_at).getTime()
    : 0;

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          new Date(notification.created_at).getTime() > lastSeenAt
      ).length,
    [lastSeenAt, notifications]
  );

  function handleToggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && latestCreatedAt) {
      try {
        window.localStorage.setItem(storageKey, String(latestCreatedAt));
        setLastSeenAt(latestCreatedAt);
      } catch {
        // Ignore storage failures in private browsing.
      }
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        onClick={handleToggleOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-3 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Notifications
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Operational alerts
            </h2>
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="skeleton h-20 rounded-[1.25rem]"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No new alerts right now.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);

                  return (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      prefetch={false}
                      className="flex gap-3 rounded-[1.25rem] border border-slate-200 px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={() => setOpen(false)}
                    >
                      <div
                        className={`mt-0.5 rounded-2xl p-2 ${getNotificationAccent(notification.type)}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {notification.title}
                          </p>
                          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {notification.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
