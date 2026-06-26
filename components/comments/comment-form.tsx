"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { CommentData } from "./types";

const QuillEditor = dynamic(() => import("./quill-editor"), { ssr: false });

interface CommentFormProps {
  isLocked: boolean;
  isSignedIn: boolean;
  onSuccess: (comment: CommentData) => void;
  postId: string;
}

export default function CommentForm({
  postId,
  isSignedIn,
  isLocked,
  onSuccess,
}: CommentFormProps) {
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const MAX = 5000;

  function handleChange(newHtml: string, newText: string) {
    setHtml(newHtml);
    setText(newText);
    if (error) {
      setError(null);
    }
    if (pendingMessage) {
      setPendingMessage(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || isPending) {
      return;
    }
    if (text.length > MAX) {
      setError(`Comment must be ${MAX.toLocaleString()} characters or fewer.`);
      return;
    }
    setError(null);
    setPendingMessage(null);
    setIsPending(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: html,
          ...(!isSignedIn && {
            authorEmail: guestEmail,
            authorName: guestName,
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (!data.isApproved) {
        setPendingMessage("Your comment is pending review by an admin.");
        // Reset editor
        setEditorKey((k) => k + 1);
        setHtml("");
        setText("");
        return;
      }

      onSuccess({
        ...data,
        createdAt: new Date(data.createdAt).toISOString(),
        reactions: [],
        replies: [],
      });
      // Reset editor by remounting
      setEditorKey((k) => k + 1);
      setHtml("");
      setText("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (isLocked) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Comments are closed on this post.
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {!isSignedIn && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={100}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              required
              type="text"
              value={guestName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={255}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={guestEmail}
            />
          </div>
        </div>
      )}

      <QuillEditor
        disabled={isPending}
        key={editorKey}
        minHeight={100}
        onChange={handleChange}
        placeholder="Leave a comment…"
        value={html}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
      {pendingMessage && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {pendingMessage}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.length > 0
            ? `${(MAX - text.length).toLocaleString()} characters remaining`
            : ""}
        </span>
        <button
          className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={isPending || !text.trim()}
          type="submit"
        >
          {isPending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}
