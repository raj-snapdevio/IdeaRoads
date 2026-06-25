"use client";

import { useState } from "react";
import type { CommentData, ReplyData } from "./types";
import CommentItem from "./comment-item";
import CommentReplyForm from "./comment-reply-form";
import CommentForm from "./comment-form";

interface CommentThreadProps {
  initialComments: CommentData[];
  postId: string;
  isSignedIn: boolean;
  isLocked: boolean;
  currentUserId: string | null;
  canModerate: boolean;
}

interface ThreadState {
  comment: CommentData;
  showReplyForm: boolean;
  replies: ReplyData[];
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
            postId={postId}
            isSignedIn={isSignedIn}
            isLocked={isLocked}
            onSuccess={handleCommentAdded}
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
              comment={thread.comment}
              currentUserId={currentUserId}
              canModerate={canModerate}
              isLocked={isLocked}
              isSignedIn={isSignedIn}
              depth={0}
              onReply={
                !isLocked ? () => toggleReplyForm(thread.comment.id) : undefined
              }
              onDelete={() => handleDeleteTopLevel(thread.comment.id)}
            />

            {/* Replies */}
            {thread.replies.length > 0 && (
              <div className="ml-10 border-l border-border pl-4 mb-2">
                {thread.replies
                  .filter((r) => r.isApproved || canModerate)
                  .map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      canModerate={canModerate}
                      isLocked={isLocked}
                      isSignedIn={isSignedIn}
                      depth={1}
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
                key={`reply-form-${thread.comment.id}`}
                postId={postId}
                parentId={thread.comment.id}
                isSignedIn={isSignedIn}
                onSuccess={(reply) =>
                  handleReplyAdded(thread.comment.id, reply)
                }
                onCancel={() => toggleReplyForm(thread.comment.id)}
              />
            )}
          </div>
        ))}
      </div>

      {/* New comment form */}
      {!isLocked && (
        <div className="pt-6 mt-2 border-t border-border">
          <CommentForm
            postId={postId}
            isSignedIn={isSignedIn}
            isLocked={isLocked}
            onSuccess={handleCommentAdded}
          />
        </div>
      )}
    </div>
  );
}
