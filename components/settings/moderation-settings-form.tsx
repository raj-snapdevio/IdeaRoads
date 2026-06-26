"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateModerationSettingsAction } from "@/app/actions/workspace-settings";

interface Props {
  commentModeration: boolean;
  moderationMode: "off" | "auto" | "manual";
  spamKeywords: string[];
  workspaceId: string;
}

const MODES = [
  {
    value: "off" as const,
    label: "Off",
    description: "All posts are published immediately.",
  },
  {
    value: "auto" as const,
    label: "Auto",
    description: "Posts containing spam keywords are held for review.",
  },
  {
    value: "manual" as const,
    label: "Manual",
    description: "All posts require admin approval before going public.",
  },
];

export function ModerationSettingsForm({
  workspaceId,
  moderationMode,
  commentModeration,
  spamKeywords,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState(moderationMode);
  const [commentMod, setCommentMod] = useState(commentModeration);
  const [keywords, setKeywords] = useState<string[]>(spamKeywords);
  const [keywordInput, setKeywordInput] = useState("");

  function addKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" && e.key !== ",") {
      return;
    }
    e.preventDefault();
    const val = keywordInput.trim().toLowerCase();
    if (!val || keywords.includes(val) || keywords.length >= 50) {
      return;
    }
    setKeywords([...keywords, val]);
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateModerationSettingsAction({
        workspaceId,
        moderationMode: mode,
        commentModeration: commentMod,
        spamKeywords: keywords,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Moderation settings saved");
      router.refresh();
    });
  }

  const btnPrimary =
    "px-3.5 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Post moderation
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Control how new posts are reviewed before appearing publicly.
        </p>
      </div>

      {/* Mode selector */}
      <div className="border border-border divide-y divide-border">
        {MODES.map((m) => (
          <label
            className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
            key={m.value}
          >
            <input
              checked={mode === m.value}
              className="mt-0.5 h-4 w-4 accent-primary"
              name="moderationMode"
              onChange={() => setMode(m.value)}
              type="radio"
              value={m.value}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Comment moderation toggle */}
      <div className="mt-6 mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Comment moderation
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Hold new comments for review before they appear.
        </p>
      </div>
      <div className="border border-border p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Require comment approval
          </p>
          <p className="text-xs text-muted-foreground">
            New comments are hidden until approved by an admin.
          </p>
        </div>
        <button
          aria-checked={commentMod}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            commentMod ? "bg-primary" : "bg-muted"
          }`}
          onClick={() => setCommentMod(!commentMod)}
          role="switch"
          type="button"
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              commentMod ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Spam keywords */}
      <div className="mt-6 mb-4">
        <h2 className="text-sm font-semibold text-foreground">Spam keywords</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Posts containing any of these keywords are held for review (when
          moderation is Auto or Manual).
        </p>
      </div>
      <div className="border border-border p-4">
        <div className="flex flex-wrap gap-1.5 min-h-8">
          {keywords.map((kw) => (
            <span
              className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 text-xs text-foreground rounded-sm"
              key={kw}
            >
              {kw}
              <button
                aria-label={`Remove ${kw}`}
                className="text-muted-foreground hover:text-foreground ml-0.5 focus-visible:outline-none"
                onClick={() => removeKeyword(kw)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          {keywords.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No spam keywords configured.
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 h-8 border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={keywords.length >= 50}
            maxLength={100}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={addKeyword}
            placeholder="Add keyword, press Enter or comma…"
            type="text"
            value={keywordInput}
          />
        </div>
        {keywords.length >= 50 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Maximum 50 keywords reached.
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className={btnPrimary}
          disabled={isPending}
          onClick={handleSave}
          type="button"
        >
          {isPending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </section>
  );
}
