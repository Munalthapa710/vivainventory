"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import MobileNav from "./MobileNav";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "vivainventory.sidebar.v1";
const DEFAULT_SIDEBAR_WIDTH = 288;
const COLLAPSED_SIDEBAR_WIDTH = 96;
const MIN_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 360;

function clampSidebarWidth(width) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

export default function AppShell({ user, children }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const sessionUser = session?.user;
  const effectiveUser =
    sessionUser &&
    Number(sessionUser.id) === Number(user.id) &&
    sessionUser.role === user.role
      ? {
          ...user,
          ...sessionUser
        }
      : user;

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

      if (storedValue) {
        const parsed = JSON.parse(storedValue);
        setCollapsed(Boolean(parsed.collapsed));
        setSidebarWidth(
          clampSidebarWidth(Number(parsed.width) || DEFAULT_SIDEBAR_WIDTH)
        );
      }
    } catch {
      setCollapsed(false);
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      JSON.stringify({
        collapsed,
        width: sidebarWidth
      })
    );
  }, [collapsed, isReady, sidebarWidth]);

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    function handleMouseMove(event) {
      setSidebarWidth(clampSidebarWidth(event.clientX));
    }

    function handleMouseUp() {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const sidebarOffset = collapsed
    ? COLLAPSED_SIDEBAR_WIDTH
    : clampSidebarWidth(sidebarWidth);
  const settingsPath = `/${effectiveUser.role}/settings`;
  const showPasswordBanner = Boolean(effectiveUser.mustChangePassword);

  return (
    <div
      className={`min-h-screen bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.08),transparent_18%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] ${isResizing ? "select-none" : ""}`}
      style={{
        "--sidebar-offset": `${sidebarOffset}px`
      }}
    >
      <Sidebar
        user={effectiveUser}
        collapsed={collapsed}
        isResizing={isResizing}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onResizeStart={() => {
          setCollapsed(false);
          setIsResizing(true);
        }}
      />

      <div className="min-h-screen transition-all duration-300 lg:pl-[var(--sidebar-offset)]">
        <Navbar
          user={effectiveUser}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="print-area px-4 pb-28 pt-[calc(6rem+var(--safe-area-top))] sm:px-6 sm:pt-[calc(7rem+var(--safe-area-top))] lg:px-8 lg:pb-10 lg:pt-[calc(8rem+var(--safe-area-top))]">
          {showPasswordBanner ? (
            <section className="mb-6 rounded-[1.75rem] border border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#fffaf3_100%)] p-4 shadow-panel sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Security Action Required
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      Update your password before continuing.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This account is using a temporary password. Save a new
                      password in settings to unlock the rest of the workspace.
                    </p>
                  </div>
                </div>
                {pathname !== settingsPath ? (
                  <Link href={`${settingsPath}?forcePasswordChange=1`} className="btn-primary">
                    Go to settings
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
          {children}
        </main>
      </div>
      <MobileNav role={effectiveUser.role} />
    </div>
  );
}
