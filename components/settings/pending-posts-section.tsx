"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approvePostAction, deletePostAction } from "@/app/actions/posts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PendingPost {
  authorEmail: string;
  authorId: string | null;
  authorName: string | null;
  boardId: string;
  body: string | null;
  createdAt: Date;
  id: string;
  slug: string;
  title: string;
  workspaceId: string;
}

interface Props {
  posts: PendingPost[];
  workspaceId: string;
}

export function PendingPostsSection({ workspaceId, posts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PendingPost | null>(null);

  function handleApprove(post: PendingPost) {
    startTransition(async () => {
      const result = await approvePostAction({
        postId: post.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Post approved: ${post.title}`);
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await deletePostAction({
        postId: deleteTarget.id,
        workspaceId,
      });
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Post deleted");
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Pending posts</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Posts awaiting approval before they appear publicly.{" "}
          {posts.length > 0 && (
            <span className="font-medium text-foreground">
              {posts.length} pending
            </span>
          )}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No posts pending approval.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {posts.map((post) => (
            <div className="flex items-start gap-4 p-4" key={post.id}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {post.title}
                </p>
                {post.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {post.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  by {post.authorName ?? post.authorEmail} ·{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(post.createdAt))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => handleApprove(post)}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="px-2.5 py-1 text-xs font-medium text-destructive border border-destructive/40 hover:bg-destructive hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => setDeleteTarget(post)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Delete post"
        description={`Delete "${deleteTarget?.title ?? ""}"? This cannot be undone.`}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
        title="Delete post"
        variant="destructive"
      />
    </section>
  );
}
