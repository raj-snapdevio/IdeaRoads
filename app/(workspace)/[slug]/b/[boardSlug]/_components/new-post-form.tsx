"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createPostAction } from "@/app/actions/posts";

interface NewPostFormProps {
  boardId: string;
  workspaceId: string;
  boardSlug: string;
  workspaceSlug: string;
}

export default function NewPostForm({
  boardId,
  workspaceId,
  boardSlug,
  workspaceSlug,
}: NewPostFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setTitle("");
    setBody("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPostAction({
        boardId,
        workspaceId,
        title: title.trim(),
        body: body.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      reset();
      router.push(`/${workspaceSlug}/b/${boardSlug}/p/${result.data.postId}`);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Submit feedback
      </button>
    );
  }

  return (
    <div className="w-full border border-border bg-background mt-4">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          Submit feedback
        </span>
        <button
          onClick={reset}
          className="text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div>
          <label
            htmlFor="post-title"
            className="block text-xs font-medium text-foreground mb-1.5"
          >
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short, descriptive title"
            maxLength={200}
            required
            disabled={isPending}
            className="w-full px-3 py-2 text-sm bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="post-body"
            className="block text-xs font-medium text-foreground mb-1.5"
          >
            Description{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="post-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add more detail about your idea or request…"
            maxLength={5000}
            rows={4}
            disabled={isPending}
            className="w-full resize-none px-3 py-2 text-sm bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
