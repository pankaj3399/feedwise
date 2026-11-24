import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-10 font-serif text-[4rem] leading-none text-lime/30">404</p>
      <h1 className="mt-2 font-serif text-4xl text-cream">This idea wandered off.</h1>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
        The page you're looking for doesn't exist. The feed, however, has 1,125 other things to read.
      </p>
      <Link
        href="/feed"
        className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[12px] font-semibold text-ink"
      >
        Back to the feed <ArrowRight size={14} />
      </Link>
    </div>
  );
}
