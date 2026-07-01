"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePostAction } from "@/app/actions/posts";

interface EditPostButtonProps {
  initialBody: string | null;
  initialTitle: string;
  postId: string;
  workspaceId: string;
}

export default function EditPostButton({
  postId,
  workspaceId,
  initialTitle,
  initialBody,
}: EditPostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePostAction({
        postId,
        workspaceId,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      if (result.success) {
        toast.success("Post updated");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to update post.");
      }
    });
  }

  return (
    <>
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        onClick={() => {
          setTitle(initialTitle);
          setBody(initialBody ?? "");
          setError(null);
          setOpen(true);
        }}
        type="button"
      >
        <Pencil className="size-3.5" />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setOpen(false)}
          />
          <form
            className="relative z-10 w-full max-w-lg bg-background border border-border shadow-lg mx-4 flex flex-col"
            onSubmit={handleSubmit}
          >
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Edit post
              </h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1">
                <label
                  className="block text-xs font-medium text-foreground"
                  htmlFor="edit-post-title"
                >
                  Title
                </label>
                <input
                  className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  id="edit-post-title"
                  maxLength={150}
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />
              </div>
              <div className="space-y-1">
                <label
                  className="block text-xs font-medium text-foreground"
                  htmlFor="edit-post-body"
                >
                  Description
                </label>
                <textarea
                  className="w-full min-h-32 border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  id="edit-post-body"
                  maxLength={10_000}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Add more detail (optional)"
                  value={body}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={isPending}
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={isPending || !title.trim()}
                type="submit"
              >
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
