"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPostAction } from "@/app/actions/posts";

interface Props {
  boardId: string;
  boardName: string;
  boardSlug: string;
  workspaceId: string;
  workspaceSlug: string;
}

export default function NewPostForm({
  boardId,
  workspaceId,
  workspaceSlug,
  boardSlug,
  boardName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const boardHref = `/${workspaceSlug}/b/${boardSlug}`;
  const bodyRemaining = 10_000 - body.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleError(null);
    setGeneralError(null);

    if (title.trim().length < 3) {
      setTitleError("Title must be at least 3 characters.");
      return;
    }

    startTransition(async () => {
      const result = await createPostAction({
        boardId,
        workspaceId,
        title: title.trim(),
        body: body.trim() || undefined,
      });

      if (!result.success) {
        if (result.field === "title") {
          setTitleError(result.error);
        } else {
          setGeneralError(result.error);
        }
        return;
      }

      router.push(`/${workspaceSlug}/b/${boardSlug}/p/${result.data.postSlug}`);
    });
  }

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="border-b border-border px-8 py-4">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={boardHref}
        >
          <ArrowLeft className="size-4" />
          {boardName}
        </Link>
      </div>

      <div className="px-8 py-8 max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          Submit feedback
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Title */}
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="post-title"
            >
              Title <span className="text-destructive">*</span>
            </label>
            <input
              className={`w-full px-3 py-2.5 text-sm bg-background border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                titleError ? "border-destructive" : "border-input"
              }`}
              disabled={isPending}
              id="post-title"
              maxLength={150}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) {
                  setTitleError(null);
                }
              }}
              placeholder="Short, descriptive title for your idea or request"
              required
              type="text"
              value={title}
            />
            <div className="flex items-start justify-between mt-1">
              {titleError ? (
                <p className="text-xs text-destructive">{titleError}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {title.length}/150
              </span>
            </div>
          </div>

          {/* Body */}
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="post-body"
            >
              Description{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </label>
            <textarea
              className="w-full resize-none px-3 py-2.5 text-sm bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              disabled={isPending}
              id="post-body"
              maxLength={10_000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more context — what problem does this solve? What would the ideal solution look like?"
              rows={7}
              value={body}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {bodyRemaining.toLocaleString()} characters remaining
            </p>
          </div>

          {generalError && (
            <p className="text-sm text-destructive">{generalError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending || title.trim().length < 3}
              type="submit"
            >
              {isPending ? "Submitting…" : "Submit feedback"}
            </button>
            <Link
              className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={boardHref}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
