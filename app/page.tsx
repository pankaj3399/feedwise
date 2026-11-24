import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Brain,
  Flame,
  Highlighter,
  Sparkles,
  Trophy,
  WifiOff,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser, homeFor } from "@/lib/session";
import { allArticles, allIdeas, quizBank } from "@/lib/content";

const FEATURES = [
  {
    icon: Sparkles,
    color: "text-lime",
    title: "One idea at a time",
    body: "Every card is one atomic insight pulled from a longer engineering essay — a complete thought, not a teaser.",
  },
  {
    icon: Flame,
    color: "text-orange-400",
    title: "A streak you can keep",
    body: "Set a daily goal of 5 to 20 ideas. The ring fills, the streak grows, and missing a day doesn't erase progress.",
  },
  {
    icon: Trophy,
    color: "text-amber-300",
    title: "XP, levels, mastery",
    body: "Reading, saving, highlighting and recalling all earn XP. Watch each topic move from curious to competent.",
  },
  {
    icon: Brain,
    color: "text-pink-300",
    title: "Recall, not just reading",
    body: "Inline and daily quizzes built from the essays turn passive scrolling into something that actually sticks.",
  },
  {
    icon: Bookmark,
    color: "text-cyan-300",
    title: "Saved ideas and collections",
    body: "File ideas into collections for interview prep, side projects, or the rabbit hole you'll return to.",
  },
  {
    icon: Highlighter,
    color: "text-violet-300",
    title: "Highlights and notes",
    body: "Select a line that makes you pause, keep it with a thought, and revisit it whenever you need it.",
  },
];

const STEPS = [
  {
    title: "Read",
    body: "Scroll a calm, endless feed of ideas. Double-tap to like, bookmark to keep.",
  },
  {
    title: "Keep",
    body: "Save into collections and highlight the lines that changed how you think.",
  },
  {
    title: "Recall",
    body: "Answer quick quizzes, earn XP, and let the ideas move into long-term memory.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  const ideas = allIdeas.length.toLocaleString("en-US");
  const essays = String(allArticles.length);
  const questions = String(quizBank.length);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(70%_100%_at_50%_0%,rgba(216,255,95,0.1),transparent_70%)]" />
      <div className="pointer-events-none absolute -left-40 top-[420px] size-[520px] rounded-full bg-violet-500/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-[720px] size-[460px] rounded-full bg-cyan-500/[0.05] blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center px-5 py-5">
        <Logo />
        <nav className="ml-auto flex items-center gap-1.5">
          <Link
            href="/login"
            className="tap rounded-full px-3.5 py-2 text-[12px] font-medium text-muted hover:text-cream"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="tap inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-[12px] font-semibold text-ink"
          >
            Get started <ArrowRight size={13} />
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[0.07] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-lime">
            <Sparkles size={12} /> {essays} essays · {ideas} atomic ideas
          </span>
          <h1 className="mt-5 text-balance font-serif text-[clamp(3.1rem,8vw,5.6rem)] leading-[0.9] tracking-[-0.03em] text-cream">
            doomscroll,
            <br />
            but <em className="text-lime">wiser</em>.
          </h1>
          <p className="mt-5 max-w-[460px] text-[14px] leading-relaxed text-muted sm:text-[15px]">
            The endless-scroll reflex, pointed at something worth knowing. Feedwise turns the best
            engineering essays into a social-style feed of atomic ideas — with streaks, recall quizzes,
            and a library that remembers what you loved.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              href="/signup"
              className="tap inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-[13px] font-semibold text-ink shadow-[0_0_40px_rgba(216,255,95,0.18)]"
            >
              Start reading <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="tap inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-3.5 text-[13px] font-medium text-cream hover:bg-white/[0.04]"
            >
              I already have an account
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-muted/70">
            <span className="flex items-center gap-1.5">
              <WifiOff size={12} className="text-lime/70" /> Works offline
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-lime/70" /> No ads, no rage-bait
            </span>
            <span className="flex items-center gap-1.5">
              <Bookmark size={12} className="text-lime/70" /> Installable on your phone
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[340px]">
          <div className="pointer-events-none absolute inset-0 -z-10 scale-95 rounded-[3rem] bg-lime/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.7rem] border border-white/[0.12] bg-[#0c0c10] p-2.5 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
            <div className="overflow-hidden rounded-[2.15rem] border border-white/[0.06] bg-ink">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <span className="flex items-center gap-1.5 font-serif text-[15px] text-cream">
                  feedwise<span className="text-lime">.</span>
                </span>
                <span className="flex items-center gap-1 rounded-full border border-white/[0.08] px-2 py-1 text-[9px] text-cream">
                  <Flame size={10} className="text-orange-400" /> 12
                </span>
              </div>
              <div className="px-4 pb-4 pt-4">
                <div className="flex items-center gap-1.5 text-[8px] font-medium uppercase tracking-[0.14em] text-cyan-300">
                  <span className="size-1.5 rounded-full bg-cyan-300" /> Algorithms
                  <span className="text-white/15">/</span>
                  <span className="text-muted">2 min</span>
                </div>
                <h2 className="mt-2.5 text-balance font-serif text-[1.85rem] leading-[0.98] tracking-[-0.02em] text-cream">
                  Bloom filters trade certainty for speed.
                </h2>
                <p className="mt-2 text-[9px] text-muted/80">
                  From <span className="text-cream/60">Bloom Filters</span>
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-cream/65">
                  A Bloom filter answers “probably yes” or “definitely no”. That tiny asymmetry is enough
                  to skip most disk reads — and it costs a fraction of a hash set.
                </p>
                <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/35 px-2.5 py-2 font-mono text-[8px] leading-relaxed text-lime-soft">
                  k = (m / n) · ln 2
                  <br />
                  false positive ≈ 0.6185^(m/n)
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[8px] text-muted">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="text-rose-400">♥</span> 214
                  </span>
                  <span className="flex flex-col items-center gap-0.5">
                    <Bookmark size={10} /> 88
                  </span>
                  <span className="flex flex-col items-center gap-0.5">
                    <Highlighter size={10} /> 12
                  </span>
                  <span className="flex flex-col items-center gap-0.5">
                    <ArrowUpRight size={10} /> source
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -left-6 top-24 hidden rounded-2xl border border-white/10 bg-[#15151b]/95 px-3 py-2 shadow-xl backdrop-blur-md sm:block">
            <p className="flex items-center gap-1 text-[9px] font-semibold text-lime">
              <Brain size={11} /> +15 XP
            </p>
            <p className="mt-0.5 text-[8px] text-muted">Recall streak</p>
          </div>
          <div className="absolute -right-5 bottom-20 hidden rounded-2xl border border-white/10 bg-[#15151b]/95 px-3 py-2 shadow-xl backdrop-blur-md sm:block">
            <p className="text-[9px] font-semibold text-cream">📚 Interview prep</p>
            <p className="mt-0.5 text-[8px] text-muted">14 ideas collected</p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: essays, label: "essays distilled" },
            { value: ideas, label: "atomic ideas" },
            { value: questions, label: "recall questions" },
            { value: "0", label: "ads or outrage" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 text-center"
            >
              <p className="font-serif text-[1.9rem] leading-none text-cream">{item.value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">Why it works</p>
        <h2 className="mt-2 max-w-[520px] text-balance font-serif text-[2.4rem] leading-[1.02] tracking-[-0.02em] text-cream sm:text-[3rem]">
          The habit, without the hangover.
        </h2>
        <div className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-white/[0.14]"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white/[0.05]">
                  <Icon size={17} className={feature.color} />
                </span>
                <h3 className="mt-3 text-[13px] font-medium text-cream">{feature.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative">
                <span className="font-serif text-[2.6rem] leading-none text-lime/25">0{index + 1}</span>
                <h3 className="mt-2 font-serif text-[1.6rem] leading-none text-cream">{step.title}</h3>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-5">
            <p className="text-[12px] text-cream/80">Two minutes a day is enough to start.</p>
            <Link
              href="/signup"
              className="tap ml-auto inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2.5 text-[12px] font-semibold text-ink"
            >
              Create your feed <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-20">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime/10 font-serif text-[18px] text-lime">
            A
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-cream">Every idea comes from Arpit Bhayani's essays.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Feedwise is an independent reading layer built on top of{" "}
              <a
                href="https://arpitbhayani.me/blogs/"
                target="_blank"
                rel="noreferrer"
                className="text-cream/80 underline decoration-white/20 underline-offset-2"
              >
                arpitbhayani.me
              </a>
              . All ideas and words belong to the author; each card links back to the original.
            </p>
          </div>
          <a
            href="https://arpitbhayani.me/blogs/"
            target="_blank"
            rel="noreferrer"
            className="tap inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[11px] text-cream/80 hover:bg-white/[0.05]"
          >
            Visit the blog <ArrowUpRight size={13} />
          </a>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 sm:flex-row sm:items-center">
          <Logo />
          <p className="text-[10px] text-muted sm:ml-4">doomscroll, but wiser.</p>
          <div className="flex items-center gap-4 text-[11px] text-muted sm:ml-auto">
            <Link href="/login" className="hover:text-cream">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-cream">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
