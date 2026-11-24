"use client";

import { useState } from "react";
import { Check, FolderPlus, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import type { Collection, Idea } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CollectionPicker({
  open,
  onClose,
  idea,
  collections,
  onToggle,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  idea: Idea | null;
  collections: Collection[];
  onToggle: (collectionId: string, value: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save to a collection"
      description={idea ? idea.title : undefined}
    >
      <div className="space-y-1.5">
        {collections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[12px] text-muted">
            No collections yet. Make one below.
          </p>
        ) : null}
        {collections.map((collection) => {
          const has = idea ? collection.ideaIds.includes(idea.id) : false;
          return (
            <button
              key={collection.id}
              onClick={() => onToggle(collection.id, !has)}
              className="tap flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-left hover:bg-white/[0.05]"
            >
              <span className="text-lg">{collection.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-cream">{collection.name}</span>
                <span className="text-[10px] text-muted">
                  {collection.ideaIds.length} {collection.ideaIds.length === 1 ? "idea" : "ideas"}
                </span>
              </span>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border",
                  has ? "border-lime bg-lime text-ink" : "border-white/15 text-transparent",
                )}
              >
                <Check size={13} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-1.5 pl-3">
        <FolderPlus size={15} className="shrink-0 text-muted" />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") create();
          }}
          placeholder="New collection name"
          maxLength={40}
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-cream outline-none placeholder:text-muted/60"
        />
        <button
          onClick={create}
          disabled={!name.trim()}
          className="tap grid size-8 shrink-0 place-items-center rounded-lg bg-lime text-ink disabled:opacity-30"
          aria-label="Create collection"
        >
          <Plus size={16} />
        </button>
      </div>
    </Sheet>
  );
}
