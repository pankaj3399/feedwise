"use client";

import { Clock3, Sparkles, Users } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function TopicTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const tabs = [
    { id: "for-you", label: "For you", icon: Sparkles, color: "#D8FF5F" },
    { id: "latest", label: "Latest", icon: Clock3, color: "#D8FF5F" },
    { id: "following", label: "Following", icon: Users, color: "#F4F1E8" },
    ...CATEGORIES.map((category) => ({
      id: category.slug,
      label: category.short,
      icon: null,
      color: category.color,
    })),
  ];

  return (
    <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.055] px-4 py-2.5">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "tap flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
              isActive
                ? "bg-lime text-ink shadow-[0_0_20px_rgba(216,255,95,0.16)]"
                : "border border-white/[0.07] bg-white/[0.025] text-muted hover:border-white/15 hover:text-cream",
            )}
          >
            {Icon ? (
              <Icon size={12} />
            ) : (
              <span className="size-1.5 rounded-full" style={{ background: tab.color }} />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
