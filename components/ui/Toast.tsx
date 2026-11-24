"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

type ToastAction = { label: string; onClick: () => void };
type ToastInput = {
  title: string;
  description?: string;
  action?: ToastAction;
  tone?: "default" | "success" | "error";
  duration?: number;
};
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ toast: (input: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { ...input, id }]);
      window.setTimeout(() => remove(id), input.duration ?? 3400);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex flex-col items-center gap-2 px-4 pb-safe">
        {items.map((item) => (
          <div
            key={item.id}
            className="animate-rise pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a20]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full ${
                item.tone === "error"
                  ? "bg-rose-400/15 text-rose-300"
                  : item.tone === "success"
                    ? "bg-lime/15 text-lime"
                    : "bg-white/10 text-cream"
              }`}
            >
              {item.tone === "error" ? <X size={15} /> : <Check size={15} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-cream">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 truncate text-[12px] text-muted">{item.description}</p>
              ) : null}
            </div>
            {item.action ? (
              <button
                onClick={() => {
                  item.action?.onClick();
                  remove(item.id);
                }}
                className="shrink-0 rounded-full bg-lime px-3 py-1.5 text-[11px] font-semibold text-ink"
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
