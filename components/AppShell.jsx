"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isReady, setIsReady] = useState(false);

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

  return (
    <div
      className={`min-h-screen bg-[#f5f7fb] ${isResizing ? "select-none" : ""}`}
      style={{
        "--sidebar-offset": `${sidebarOffset}px`
      }}
    >
      <Sidebar
        user={user}
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
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="print-area px-4 pb-28 pt-[calc(6rem+var(--safe-area-top))] sm:px-6 sm:pt-[calc(7rem+var(--safe-area-top))] lg:px-8 lg:pb-10 lg:pt-[calc(8rem+var(--safe-area-top))]">
          {children}
        </main>
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}
