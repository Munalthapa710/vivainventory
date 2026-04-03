"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
  size = "md"
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const sizeClass =
    size === "lg"
      ? "max-w-3xl"
      : size === "sm"
        ? "max-w-md"
        : "max-w-xl";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative z-10 flex max-h-[88vh] w-full flex-col ${sizeClass} overflow-hidden rounded-t-[2rem] bg-white p-5 shadow-2xl shadow-slate-950/20 sm:rounded-[2rem] sm:p-6`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 overflow-y-auto pr-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}
