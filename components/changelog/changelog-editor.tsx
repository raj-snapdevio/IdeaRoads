"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createChangelogEntryAction,
  publishChangelogEntryAction,
  updateChangelogEntryAction,
} from "@/app/actions/changelog";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { LinkedPostsSelector } from "@/components/changelog/linked-posts-selector";
import {
  CHANGELOG_LABEL_VALUES,
  getLabelInfo,
} from "@/lib/changelog/constants";

interface LinkedPost {
  boardName: string;
  boardSlug: string;
  id: string;
  slug: string;
  status: string;
  title: string;
  upvotes: number;
}

interface ChangelogEditorProps {
  initialEntry?: {
    id: string;
    title: string;
    body: string;
    label: string;
    isPublished: boolean;
    linkedPosts: LinkedPost[];
  };
  workspaceId: string;
  workspaceSlug: string;
}

type EditorTab = "write" | "preview";

export function ChangelogEditor({
  workspaceId,
  workspaceSlug,
  initialEntry,
}: ChangelogEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [entryId, setEntryId] = useState<string | null>(
    initialEntry?.id ?? null
  );
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [body, setBody] = useState(initialEntry?.body ?? "");
  const [label, setLabel] = useState(initialEntry?.label ?? "new_feature");
  const [linkedPosts, setLinkedPosts] = useState<LinkedPost[]>(
    initialEntry?.linkedPosts ?? []
  );
  const [tab, setTab] = useState<EditorTab>("write");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [previewHtml, setPreviewHtml] = useState("");
  const isPublished = initialEntry?.isPublished ?? false;

  // Auto-save: debounced, fires after 30s of idle
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSave = useRef(false);

  const doAutoSave = useCallback(async () => {
    if (!title.trim()) {
      return;
    }
    setSaveStatus("saving");
    try {
      if (entryId) {
        await updateChangelogEntryAction({
          entryId,
          workspaceId,
          title: title.trim(),
          body,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
      } else {
        const result = await createChangelogEntryAction({
          workspaceId,
          title: title.trim(),
          body,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (result.success) {
          setEntryId(result.data.id);
        }
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [entryId, workspaceId, title, body, label, linkedPosts]);

  // Schedule auto-save whenever content changes
  useEffect(() => {
    if (!title.trim()) {
      return;
    }
    pendingAutoSave.current = true;
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    autoSaveRef.current = setTimeout(() => {
      if (pendingAutoSave.current) {
        pendingAutoSave.current = false;
        doAutoSave();
      }
    }, 30_000);
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [title, body, label, linkedPosts, doAutoSave]);

  // Load preview HTML when switching to preview tab
  useEffect(() => {
    if (tab !== "preview") {
      return;
    }
    import("@/lib/changelog/markdown").then(({ renderMarkdown }) => {
      setPreviewHtml(renderMarkdown(body));
    });
  }, [tab, body]);

  function handleSaveDraft() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    startTransition(async () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      if (entryId) {
        const result = await updateChangelogEntryAction({
          entryId,
          workspaceId,
          title: title.trim(),
          body,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Draft saved");
        router.refresh();
      } else {
        const result = await createChangelogEntryAction({
          workspaceId,
          title: title.trim(),
          body,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setEntryId(result.data.id);
        toast.success("Draft saved");
        router.push(`/${workspaceSlug}/changelog/${result.data.id}/edit`);
      }
    });
  }

  function handlePublish() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    startTransition(async () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }

      let id = entryId;
      if (id) {
        const result = await updateChangelogEntryAction({
          entryId: id,
          workspaceId,
          title: title.trim(),
          body,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      } else {
        const result = await createChangelogEntryAction({
          workspaceId,
          title: title.trim(),
          body,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        id = result.data.id;
        setEntryId(id);
      }

      const publishResult = await publishChangelogEntryAction({
        entryId: id,
        workspaceId,
      });
      if (!publishResult.success) {
        toast.error(publishResult.error);
        return;
      }

      toast.success("Entry published");
      router.push(`/${workspaceSlug}/changelog`);
    });
  }

  function handleUpdate() {
    if (!entryId || !title.trim()) {
      return;
    }
    startTransition(async () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      const result = await updateChangelogEntryAction({
        entryId,
        workspaceId,
        title: title.trim(),
        body,
        label,
        postIds: linkedPosts.map((p) => p.id),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry updated");
      router.push(`/${workspaceSlug}/changelog`);
    });
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6 max-w-3xl">
      {/* Title */}
      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground uppercase tracking-wide"
          htmlFor="title"
        >
          Title
        </label>
        <div className="relative">
          <input
            className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            id="title"
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What shipped?"
            type="text"
            value={title}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {title.length}/200
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground uppercase tracking-wide"
          htmlFor="label"
        >
          Label
        </label>
        <div className="flex flex-wrap gap-2">
          {CHANGELOG_LABEL_VALUES.map((l) => {
            const info = getLabelInfo(l);
            const isActive = label === l;
            return (
              <button
                className={`px-3 py-1.5 text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "border-current"
                    : "border-border text-muted-foreground hover:border-muted-foreground/50"
                }`}
                key={l}
                onClick={() => setLabel(l)}
                style={
                  isActive
                    ? {
                        color: info.color,
                        backgroundColor: `${info.color}12`,
                        borderColor: `${info.color}60`,
                      }
                    : {}
                }
                type="button"
              >
                {info.label}
              </button>
            );
          })}
        </div>
        <div className="mt-1">
          <ChangelogLabelBadge label={label} size="md" />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Content
          </label>
          <div className="flex">
            <button
              className={`px-3 py-1 text-xs font-medium border-b-2 transition-colors focus-visible:outline-none ${
                tab === "write"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("write")}
              type="button"
            >
              Write
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium border-b-2 transition-colors focus-visible:outline-none ${
                tab === "preview"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("preview")}
              type="button"
            >
              Preview
            </button>
          </div>
        </div>

        {tab === "write" ? (
          <textarea
            className="w-full border border-border bg-background px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            maxLength={50_000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your changelog in Markdown…&#10;&#10;## What's new&#10;&#10;- Feature A&#10;- Feature B"
            rows={18}
            value={body}
          />
        ) : (
          <div
            className="min-h-[300px] border border-border bg-muted/20 px-4 py-3 prose prose-sm max-w-none text-foreground"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: server-side sanitized via DOMPurify
            dangerouslySetInnerHTML={{
              __html:
                previewHtml ||
                "<p class='text-muted-foreground italic'>Nothing to preview yet.</p>",
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Markdown supported: **bold**, *italic*, `code`, ## headings, - lists,
          [link](url)
        </p>
      </div>

      {/* Linked Posts */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Linked Feedback Posts
          <span className="ml-1 text-muted-foreground font-normal normal-case">
            (optional)
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          Link feedback posts that shipped in this update. Voters will be
          notified on first publish.
        </p>
        <LinkedPostsSelector
          onChange={setLinkedPosts}
          selectedPosts={linkedPosts}
          workspaceId={workspaceId}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-1.5">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-600">Saved</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isPublished && (
            <button
              className="px-4 py-2 text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending || !title.trim()}
              onClick={handleSaveDraft}
              type="button"
            >
              Save Draft
            </button>
          )}

          {isPublished ? (
            <button
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending || !title.trim()}
              onClick={handleUpdate}
              type="button"
            >
              {isPending ? "Saving…" : "Update"}
            </button>
          ) : (
            <button
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending || !title.trim()}
              onClick={handlePublish}
              type="button"
            >
              {isPending ? "Publishing…" : "Publish →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
