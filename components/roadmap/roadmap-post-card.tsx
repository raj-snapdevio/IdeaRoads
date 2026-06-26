import { MessageSquare, Pin } from "lucide-react";
import Link from "next/link";
import { CategoryChip } from "@/components/categories/category-chip";
import VoteButton from "@/components/voting/vote-button";
import type { RoadmapPost } from "@/lib/roadmap/queries";

interface RoadmapPostCardProps {
  isSignedIn: boolean;
  post: RoadmapPost;
  workspaceSlug: string;
}

export function RoadmapPostCard({
  post,
  workspaceSlug,
  isSignedIn,
}: RoadmapPostCardProps) {
  const postHref = `/${workspaceSlug}/b/${post.boardSlug}/p/${post.slug}`;
  const boardHref = `/${workspaceSlug}/b/${post.boardSlug}`;

  return (
    <div className="group bg-background border border-border p-4 hover:border-border/80 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start gap-3">
        {/* Vote button — compact */}
        <div className="shrink-0">
          <VoteButton
            initialCount={post.upvotes}
            initialHasVoted={post.hasVoted}
            isArchived={false}
            isLocked={false}
            isSignedIn={isSignedIn}
            postId={post.id}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start gap-1.5">
            {post.isPinned && (
              <Pin className="size-3 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <Link
              className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors leading-snug group-hover:underline underline-offset-2"
              href={postHref}
            >
              {post.title}
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {post.categoryName && post.categoryColor && (
              <CategoryChip
                color={post.categoryColor}
                name={post.categoryName}
                size="xs"
              />
            )}
            {post.commentCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare className="size-3" />
                {post.commentCount}
              </span>
            )}
          </div>

          <Link
            className="mt-2 inline-block text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            href={boardHref}
          >
            {post.boardName}
          </Link>
        </div>
      </div>
    </div>
  );
}
