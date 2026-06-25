"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCommentAction } from "@/app/actions/comments";

interface CommentFormProps {
  postId: string;
  workspaceId: string;
}

export default function CommentForm({ postId, workspaceId }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await addCommentAction({ postId, workspaceId, content });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setContent("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Leave a comment…"
        maxLength={2000}
        rows={3}
        disabled={isPending}
        className="w-full resize-none px-3 py-2.5 text-sm bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {(2000 - content.length).toLocaleString()} characters remaining
        </span>
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {isPending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}
