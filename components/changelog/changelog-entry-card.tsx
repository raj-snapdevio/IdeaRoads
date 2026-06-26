import { format } from "date-fns";
import Link from "next/link";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { truncateMarkdownToText } from "@/lib/changelog/markdown";

interface ChangelogEntryCardProps {
  entry: {
    id: string;
    title: string;
    label: string;
    body: string;
    publishedAt: Date | null;
    linkedPostCount: number;
  };
  workspaceSlug: string;
}

export function ChangelogEntryCard({
  entry,
  workspaceSlug,
}: ChangelogEntryCardProps) {
  const excerpt = truncateMarkdownToText(entry.body, 220);
  const href = `/${workspaceSlug}/changelog/${entry.id}`;

  return (
    <article className="py-8 border-b border-border last:border-0">
      <div className="flex items-center gap-3 mb-3">
        <ChangelogLabelBadge label={entry.label} />
        {entry.publishedAt && (
          <time
            className="text-xs text-muted-foreground"
            dateTime={entry.publishedAt.toISOString()}
          >
            {format(entry.publishedAt, "MMM d, yyyy")}
          </time>
        )}
      </div>

      <h2 className="text-lg font-semibold text-foreground leading-snug">
        <Link
          className="hover:text-foreground/70 transition-colors"
          href={href}
        >
          {entry.title}
        </Link>
      </h2>

      {excerpt && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {excerpt}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <Link
          className="text-xs font-medium text-foreground hover:text-foreground/70 transition-colors"
          href={href}
        >
          Read more →
        </Link>
        {entry.linkedPostCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {entry.linkedPostCount} linked post
            {entry.linkedPostCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </article>
  );
}
