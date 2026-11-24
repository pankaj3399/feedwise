"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Home, User, Brain, Flame } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { UserProvider, useUser } from "@/components/providers/UserProvider";
import type { Stats, User as UserType } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/topics", label: "Topics", icon: Compass },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "You", icon: User },
];

function Header() {
  const { user, stats } = useUser();
  return (
    <header className="z-30 flex h-[62px] shrink-0 items-center gap-2 border-b border-white/[0.055] px-4">
      <Logo />
      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/quiz"
          aria-label="Daily recall quiz"
          className="tap hidden size-9 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-cream sm:grid"
        >
          <Brain size={18} />
        </Link>
        <Link
          href="/profile"
          title={`${stats.streak} day streak`}
          className="tap flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5"
        >
          <Flame size={14} className={stats.streak > 0 ? "text-orange-400" : "text-muted"} />
          <span className={cn("text-[12px] font-semibold", stats.streak > 0 ? "text-cream" : "text-muted")}>
            {stats.streak}
          </span>
        </Link>
        <Link
          href="/profile"
          aria-label="Daily goal"
          className="tap"
          title={`${stats.todayReads} of ${stats.goal} ideas today`}
        >
          <ProgressRing
            progress={stats.goal ? stats.todayReads / stats.goal : 0}
            size={34}
            stroke={2.6}
          >
            <span className="text-[9px] font-bold leading-none text-cream">{stats.todayReads}</span>
          </ProgressRing>
        </Link>
        <Link href="/profile" aria-label="Profile" className="tap ml-0.5">
          <Avatar name={user.name} email={user.email} size={33} />
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="z-30 shrink-0 border-t border-white/[0.06] bg-ink/95 pb-safe backdrop-blur-xl">
      <div className="grid h-[60px] grid-cols-4">
        {NAV.map((item) => {
          const active =
            item.href === "/saved"
              ? pathname.startsWith("/saved") || pathname.startsWith("/highlights")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-lime" : "text-muted hover:text-cream",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-1 w-1 rounded-full bg-lime transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  user,
  stats,
  children,
}: {
  user: UserType;
  stats: Stats;
  children: React.ReactNode;
}) {
  return (
    <UserProvider initialUser={user} initialStats={stats}>
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[640px] flex-col overflow-hidden border-x border-white/[0.055] bg-ink">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-64 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(216,255,95,0.055),transparent_70%)]" />
        <Header />
        <main className="relative min-h-0 flex-1">{children}</main>
        <BottomNav />
      </div>
    </UserProvider>
  );
}
