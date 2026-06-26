import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceActionsPanel } from "@/components/orbit/workspace-actions-panel";
import { Badge } from "@/components/ui/badge";
import { getOrbitWorkspace } from "@/lib/orbit/workspaces";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Workspace Detail" };

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function OrbitWorkspaceDetailPage({ params }: Props) {
  const { workspaceId } = await params;
  const ws = await getOrbitWorkspace(workspaceId);

  if (!ws) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground hover:text-foreground transition-colors"
          href="/orbit/workspaces"
        >
          ← Workspaces
        </Link>
      </div>

      {/* Header with actions */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-black text-2xl tracking-normal">{ws.name}</h1>
            <Badge
              className={ws.isSuspended ? undefined : "text-success"}
              variant={ws.isSuspended ? "destructive" : "default"}
            >
              {ws.isSuspended ? "Suspended" : "Active"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            /{ws.slug}
          </p>
          {ws.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {ws.description}
            </p>
          )}
        </div>
        <WorkspaceActionsPanel
          isSuspended={ws.isSuspended}
          workspaceId={ws.id}
          workspaceSlug={ws.slug}
        />
      </div>

      {/* Meta */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard label="Owner" value={ws.ownerEmail ?? "—"} />
        <MetaCard label="Members" value={String(ws.memberCount)} />
        <MetaCard label="Posts" value={String(ws.postCount)} />
        <MetaCard label="Created" value={formatDateTime(ws.createdAt)} />
      </div>

      {ws.isSuspended && ws.suspendedAt && (
        <div className="mb-8 border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">
            Suspended on {formatDateTime(ws.suspendedAt)}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Boards */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-sm">
              Boards ({ws.boards.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {ws.boards.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No boards.
              </p>
            ) : (
              ws.boards.map((b) => (
                <div className="px-4 py-2.5" key={b.id}>
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    /{b.slug}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-sm">
              Categories ({ws.categories.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {ws.categories.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No categories.
              </p>
            ) : (
              ws.categories.map((c) => (
                <div className="px-4 py-2.5" key={c.id}>
                  <p className="text-sm">{c.name}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-sm">Recent Posts</h2>
          </div>
          <div className="divide-y divide-border">
            {ws.recentPosts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No posts yet.
              </p>
            ) : (
              ws.recentPosts.map((p) => (
                <div className="px-4 py-2.5" key={p.id}>
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(p.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
