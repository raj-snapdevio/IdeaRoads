"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ReplyData } from "./types";

const QuillEditor = dynamic(() => import("./quill-editor"), { ssr: false });

interface CommentReplyFormProps {
  isSignedIn: boolean;
  onCancel: () => void;
  onSuccess: (reply: ReplyData) => void;
  parentId: string;
  postId: string;
}

export default function CommentReplyForm({
  postId,
  parentId,
  isSignedIn,
  onSuccess,
  onCancel,
}: CommentReplyFormProps) {
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
      setError(`Reply must be ${MAX.toLocaleString()} characters or fewer.`);
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
          parentId,
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
        setPendingMessage("Your reply is pending review by an admin.");
        setEditorKey((k) => k + 1);
        setHtml("");
        setText("");
        return;
      }

      // Clear editor before closing
      setEditorKey((k) => k + 1);
      setHtml("");
      setText("");
      onSuccess({
        ...data,
        createdAt: new Date(data.createdAt).toISOString(),
        reactions: [],
      });
      onCancel();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="mt-3 ml-10 space-y-2" onSubmit={handleSubmit}>
      {!isSignedIn && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
        minHeight={72}
        onChange={handleChange}
        placeholder="Write a reply…"
        value={html}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
      {pendingMessage && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {pendingMessage}
        </p>
      )}

      <div className="flex items-center gap-2 justify-end">
        <button
          className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={isPending || !text.trim()}
          type="submit"
        >
          {isPending ? "Posting…" : "Reply"}
        </button>
      </div>
    </form>
  );
}
