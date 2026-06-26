"use client";

import { useState } from "react";
import CommentForm from "./comment-form";
import CommentItem from "./comment-item";
import CommentReplyForm from "./comment-reply-form";
import type { CommentData, ReplyData } from "./types";

interface CommentThreadProps {
  canModerate: boolean;
  currentUserId: string | null;
  initialComments: CommentData[];
  isLocked: boolean;
  isSignedIn: boolean;
  postId: string;
}

interface ThreadState {
  comment: CommentData;
  replies: ReplyData[];
  showReplyForm: boolean;
}

export default function CommentThread({
  initialComments,
  postId,
  isSignedIn,
  isLocked,
  currentUserId,
  canModerate,
}: CommentThreadProps) {
  const [threads, setThreads] = useState<ThreadState[]>(() =>
    initialComments.map((c) => ({
      comment: c,
      showReplyForm: false,
      replies: c.replies,
    }))
  );

  function handleCommentAdded(newComment: CommentData) {
    setThreads((prev) => [
      ...prev,
      { comment: newComment, showReplyForm: false, replies: [] },
    ]);
  }

  function handleReplyAdded(parentId: string, reply: ReplyData) {
    setThreads((prev) =>
      prev.map((t) =>
        t.comment.id === parentId
          ? { ...t, replies: [...t.replies, reply], showReplyForm: false }
          : t
      )
    );
  }

  function toggleReplyForm(commentId: string) {
    setThreads((prev) =>
      prev.map((t) =>
        t.comment.id === commentId
          ? { ...t, showReplyForm: !t.showReplyForm }
          : { ...t, showReplyForm: false }
      )
    );
  }

  function handleDeleteTopLevel(commentId: string) {
    // Hard delete — remove from UI entirely regardless of replies
    setThreads((prev) => prev.filter((t) => t.comment.id !== commentId));
  }

  function handleDeleteReply(parentId: string, replyId: string) {
    setThreads((prev) =>
      prev.map((t) =>
        t.comment.id === parentId
          ? {
              ...t,
              replies: t.replies.filter((r) => r.id !== replyId),
            }
          : t
      )
    );
  }

  const approvedThreads = threads.filter(
    (t) => t.comment.isApproved || canModerate
  );

  if (approvedThreads.length === 0 && !isLocked) {
    return (
      <div className="space-y-0">
        <p className="text-xs text-muted-foreground py-4 border-b border-border">
          No comments yet. Be the first to share your thoughts.
        </p>
        <div className="pt-6">
          <CommentForm
            isLocked={isLocked}
            isSignedIn={isSignedIn}
            onSuccess={handleCommentAdded}
            postId={postId}
          />
        </div>
      </div>
    );
  }

  if (approvedThreads.length === 0 && isLocked) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No comments. Comments are closed on this post.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {/* Comment threads */}
      <div>
        {approvedThreads.map((thread) => (
          <div key={thread.comment.id}>
            <CommentItem
              canModerate={canModerate}
              comment={thread.comment}
              currentUserId={currentUserId}
              depth={0}
              isLocked={isLocked}
              isSignedIn={isSignedIn}
              onDelete={() => handleDeleteTopLevel(thread.comment.id)}
              onReply={
                isLocked ? undefined : () => toggleReplyForm(thread.comment.id)
              }
            />

            {/* Replies */}
            {thread.replies.length > 0 && (
              <div className="ml-10 border-l border-border pl-4 mb-2">
                {thread.replies
                  .filter((r) => r.isApproved || canModerate)
                  .map((reply) => (
                    <CommentItem
                      canModerate={canModerate}
                      comment={reply}
                      currentUserId={currentUserId}
                      depth={1}
                      isLocked={isLocked}
                      isSignedIn={isSignedIn}
                      key={reply.id}
                      onDelete={() =>
                        handleDeleteReply(thread.comment.id, reply.id)
                      }
                    />
                  ))}
              </div>
            )}

            {/* Inline reply form */}
            {thread.showReplyForm && (
              <CommentReplyForm
                isSignedIn={isSignedIn}
                key={`reply-form-${thread.comment.id}`}
                onCancel={() => toggleReplyForm(thread.comment.id)}
                onSuccess={(reply) =>
                  handleReplyAdded(thread.comment.id, reply)
                }
                parentId={thread.comment.id}
                postId={postId}
              />
            )}
          </div>
        ))}
      </div>

      {/* New comment form */}
      {!isLocked && (
        <div className="pt-6 mt-2 border-t border-border">
          <CommentForm
            isLocked={isLocked}
            isSignedIn={isSignedIn}
            onSuccess={handleCommentAdded}
            postId={postId}
          />
        </div>
      )}
    </div>
  );
}
