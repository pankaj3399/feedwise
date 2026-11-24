import { cn, hashString, initials } from "@/lib/utils";

const PALETTES = [
  ["#D8FF5F", "#7C9B1C"],
  ["#A78BFA", "#5B3FD1"],
  ["#22D3EE", "#0E7490"],
  ["#FBBF24", "#B45309"],
  ["#F472B6", "#BE185D"],
  ["#34D399", "#047857"],
];

export function Avatar({
  name,
  email,
  size = 34,
  className,
}: {
  name: string | null;
  email: string;
  size?: number;
  className?: string;
}) {
  const palette = PALETTES[hashString(email) % PALETTES.length];
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold text-ink ring-2 ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
      }}
      aria-hidden
    >
      {initials(name, email)}
    </span>
  );
}
