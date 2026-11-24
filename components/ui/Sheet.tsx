"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="animate-sheet relative w-full max-w-[560px] rounded-t-[28px] border border-white/10 bg-[#121216] px-5 pb-8 pt-3 shadow-2xl shadow-black/60">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="font-serif text-2xl text-cream">{title}</h2> : null}
            {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="tap grid size-8 place-items-center rounded-full bg-white/5 text-muted"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
