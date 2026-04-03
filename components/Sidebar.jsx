"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { getNavigationLinks } from "@/lib/navigation";

export default function Sidebar({
  user,
  collapsed,
  isResizing,
  mobileOpen,
  onClose,
  onToggleCollapsed,
  onResizeStart
}) {
  const pathname = usePathname();
  const links = getNavigationLinks(user.role);
  const isCompact = collapsed && !mobileOpen;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[88vw] max-w-[320px] flex-col border-r border-slate-200 bg-white pt-[var(--safe-area-top)] text-slate-700 transition duration-300 lg:z-30 lg:max-w-none lg:[width:var(--sidebar-offset)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <Link
            href={user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard"}
            prefetch={false}
            className="min-w-0"
          >
            <BrandLogo
              size={isCompact ? 44 : 48}
              showText={!isCompact}
              subtitle={user.role === "admin" ? "Admin Console" : "Employee Desk"}
              titleClassName="text-lg"
            />
          </Link>

          <button
            type="button"
            className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(var(--safe-area-bottom)+1rem)]">
          <nav className="space-y-2">
            {links.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  title={isCompact ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCompact && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            className="hidden w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:flex"
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
            {!isCompact && <span>Collapse</span>}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            <span>Close menu</span>
          </button>
        </div>

        {!isCompact && (
          <button
            type="button"
            aria-label="Resize sidebar"
            className={`absolute right-0 top-0 hidden h-full w-3 -translate-x-1/2 cursor-col-resize lg:block ${
              isResizing ? "bg-indigo-100/80" : "bg-transparent"
            }`}
            onMouseDown={(event) => {
              event.preventDefault();
              onResizeStart();
            }}
          >
            <span className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 rounded-full bg-slate-200" />
          </button>
        )}
      </aside>
    </>
  );
}
