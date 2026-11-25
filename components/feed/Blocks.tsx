import { Check } from "lucide-react";
import type { Block } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RichText } from "@/components/content/RichText";

function Inline({ text }: { text: string }) {
  return <RichText text={text} />;
}

export function Blocks({
  blocks,
  preview = false,
  className,
  variant = "default",
}: {
  blocks: Block[];
  preview?: boolean;
  className?: string;
  variant?: "default" | "action";
}) {
  const shown = preview
    ? blocks.filter((block) => block.type !== "code").slice(0, 3)
    : blocks;

  if (!shown.length) {
    const firstCode = blocks.find((block) => block.type === "code");
    if (firstCode && firstCode.type === "code") {
      return (
        <pre className="no-scrollbar overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] leading-5 text-cream/80">
          <code>{firstCode.text}</code>
        </pre>
      );
    }
    return null;
  }

  return (
    <div className={cn("space-y-3.5 text-[15px] leading-[1.72] text-cream/75", className)}>
      {shown.map((block, index) => {
        if (block.type === "p") {
          return (
            <p key={index}>
              <Inline text={block.text} />
            </p>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={index} className="pt-1 text-[12px] font-semibold uppercase tracking-[0.13em] text-cream/90">
              {block.text}
            </h3>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-lime/50 py-0.5 pl-4 font-serif text-[19px] italic leading-snug text-cream/90"
            >
              <Inline text={block.text} />
            </blockquote>
          );
        }
        if (block.type === "list") {
          if (variant === "action") {
            return (
              <ul key={index} className="space-y-2.5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2.5 text-[14px] leading-relaxed">
                    <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          }
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={index}
              className={cn(
                "space-y-2 pl-5 marker:text-lime/70",
                block.ordered ? "list-decimal" : "list-disc",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  <Inline text={item} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.type === "code") {
          return (
            <div key={index} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {block.lang ? (
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
                  <span className="size-1.5 rounded-full bg-lime/60" />
                  {block.lang}
                </div>
              ) : null}
              <pre className="no-scrollbar overflow-x-auto p-3 text-[11px] leading-[1.65] text-cream/75">
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }
        if (block.type === "table") {
          return (
            <div key={index} className="no-scrollbar overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[420px] text-left text-[12px]">
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? "bg-white/[0.05]" : ""}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border-b border-white/[0.06] px-3 py-2 align-top">
                          <Inline text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
