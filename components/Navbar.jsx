"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Cog, LogOut, Menu } from "lucide-react";
import PwaInstallButton from "./PwaInstallButton";

function titleFromPath(pathname) {
  const cleaned = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );

  if (cleaned.length === 0) {
    return "Dashboard";
  }

  if (pathname.startsWith("/admin/users/") && cleaned.length >= 3) {
    return "User Inventory";
  }

  return cleaned[cleaned.length - 1];
}

export default function Navbar({ user, onMenuClick }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef(null);
  const settingsHref = `/${user.role}/settings`;
  const initials = user.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setProfileOpen(false);

    try {
      await signOut({
        redirect: false
      });
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <header className="no-print fixed left-0 right-0 top-0 z-20 border-b border-slate-200 bg-white/95 pt-[var(--safe-area-top)] backdrop-blur lg:left-[var(--sidebar-offset)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">
              Welcome {user.name}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 sm:hidden">
              {today}
            </p>
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => setProfileOpen((current) => !current)}
            >
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-sm font-semibold text-white">
                {initials || "VI"}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 w-72 max-w-[calc(100vw-1.5rem)] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/70">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {user.role}
                  </p>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="sm:hidden">
                    <PwaInstallButton
                      className="w-full justify-start"
                      variant="secondary"
                    />
                  </div>
                  <Link
                    href={settingsHref}
                    prefetch={false}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Cog className="h-4 w-4" />
                    <span>Edit settings</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
