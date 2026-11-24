import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/feed" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-lime shadow-[0_0_24px_rgba(216,255,95,0.25)] transition-transform duration-300 group-hover:rotate-6">
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 1.4c.5 3.2 2.4 5.1 5.6 5.6-3.2.5-5.1 2.4-5.6 5.6-.5-3.2-2.4-5.1-5.6-5.6C5.6 6.5 7.5 4.6 8 1.4Z"
            fill="#08080A"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="font-serif text-[23px] leading-none tracking-[-0.01em] text-cream">
          feedwise<span className="text-lime">.</span>
        </span>
      ) : null}
    </Link>
  );
}
