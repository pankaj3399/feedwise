import type { InsightType } from "./types";

export const INSIGHT_TYPES: Record<
  InsightType,
  { label: string; color: string; soft: string }
> = {
  thesis: { label: "Big idea", color: "#D8FF5F", soft: "rgba(216,255,95,0.12)" },
  concept: { label: "Concept", color: "#22D3EE", soft: "rgba(34,211,238,0.12)" },
  pattern: { label: "Pattern", color: "#A78BFA", soft: "rgba(167,139,250,0.12)" },
  tradeoff: { label: "Tradeoff", color: "#FBBF24", soft: "rgba(251,191,36,0.12)" },
  failure: { label: "Failure", color: "#F472B6", soft: "rgba(244,114,182,0.12)" },
  action: { label: "Do this", color: "#34D399", soft: "rgba(52,211,153,0.12)" },
  result: { label: "Result", color: "#D8FF5F", soft: "rgba(216,255,95,0.12)" },
};

export function insightTypeOf(type?: InsightType | null) {
  return type ? INSIGHT_TYPES[type] : null;
}
