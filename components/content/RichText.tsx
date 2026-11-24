import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Inline snippets come from KaTeX-rendered math in the source essays, stored
 * between backticks. Most are plain identifiers; only a subset is real math.
 */
export function isMathSnippet(text: string) {
  const value = text.trim();
  if (!value) return false;
  if (/\\|\^|_\{|\}\^/.test(value)) return true;
  if (/^[A-Za-z]\s*[_^]\s*(\d{1,3}|[A-Za-z]{1,2})$/.test(value)) return true;
  if (/^[A-Za-z]{1,3}\([^)]*\)$/.test(value)) return true;
  if (/^[A-Za-z][A-Za-z0-9]*\s*[=<>]\s*[^=].*$/.test(value)) return true;
  return false;
}

export function InlineMath({ tex, className }: { tex: string; className?: string }) {
  const source = tex.trim();
  try {
    const html = katex.renderToString(source, {
      throwOnError: false,
      displayMode: false,
      output: "html",
      strict: false,
      trust: false,
    });
    return (
      <span
        className={cn("inline-math", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <code className={cn("font-mono text-[0.88em]", className)}>{source}</code>;
  }
}

/** A single bare snippet: math when it looks like math, code otherwise. */
export function InlineSnippet({ text, mono = false }: { text: string; mono?: boolean }) {
  if (isMathSnippet(text)) return <InlineMath tex={text} />;
  return (
    <span className={cn(mono && "font-mono text-[0.92em]")}>{text}</span>
  );
}

/** Renders text that may contain `code`, `math`, **bold** and *italic*. */export function RichText({
  text,
  codeClassName,
}: {
  text: string;
  codeClassName?: string;
}) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {tokens.map((token, index) => {
        if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
          const inner = token.slice(1, -1);
          if (isMathSnippet(inner)) return <InlineMath key={index} tex={inner} />;
          return (
            <code
              key={index}
              className={cn(
                "rounded-[5px] border border-lime/15 bg-lime/[0.07] px-1 py-0.5 font-mono text-[0.86em] text-lime-soft",
                codeClassName,
              )}
            >
              {inner}
            </code>
          );
        }
        if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
          return (
            <strong key={index} className="font-semibold text-cream">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
          return (
            <em key={index} className="italic text-cream/90">
              {token.slice(1, -1)}
            </em>
          );
        }
        return <span key={index}>{token}</span>;
      })}
    </>
  );
}
