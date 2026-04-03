"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigationLinks } from "@/lib/navigation";

export default function MobileNav({ role }) {
  const pathname = usePathname();
  const links = getNavigationLinks(role);

  if (links.length === 0) {
    return null;
  }

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="grid auto-cols-fr grid-flow-col gap-1 overflow-x-auto px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 no-scrollbar">
        {links.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition ${
                active
                  ? "bg-orange-50 text-orange-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="line-clamp-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
