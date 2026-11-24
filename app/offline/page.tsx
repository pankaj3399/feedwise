import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, WifiOff } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(75%_100%_at_50%_0%,rgba(216,255,95,0.08),transparent_70%)]" />
      <div className="relative w-full max-w-[380px]">
        <div className="flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto mt-10 grid size-20 place-items-center rounded-[26px] border border-white/[0.08] bg-white/[0.035] text-muted">
          <WifiOff size={32} />
        </span>
        <h1 className="mt-6 text-balance font-serif text-[2.6rem] leading-[1.0] tracking-[-0.02em] text-cream">
          You're offline.
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          The ideas you've already loaded are still in the app. Reconnect to sync likes, saves, and
          today's streak.
        </p>
        <Link
          href="/feed"
          className="tap mt-7 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-[13px] font-semibold text-ink"
        >
          Try the cached feed <ArrowRight size={14} />
        </Link>
        <p className="mt-5 text-[10px] leading-relaxed text-muted/60">
          Tip: open Feedwise at least once while online so the library is cached on this device.
        </p>
      </div>
    </div>
  );
}
