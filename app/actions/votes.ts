"use server";

import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { getPost } from "@/lib/posts/queries";
import { addVote, getUserVote, removeVote } from "@/lib/posts/votes";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function toggleVoteAction(input: {
  postId: string;
  workspaceId: string;
}): Promise<ActionResult<{ voted: boolean; upvotes: number }>> {
  const session = await requireSession();

  const actorMember = await getWorkspaceMember(
    input.workspaceId,
    session.user.id
  );
  if (!actorMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  const post = await getPost(input.postId);
  if (!post || post.workspaceId !== input.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  const hasVoted = await getUserVote(input.postId, session.user.id);

  if (hasVoted) {
    await removeVote(input.postId, session.user.id);

    audit({
      action: "vote.removed",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "post",
      entityId: input.postId,
      description: `Removed vote from: ${post.title}`,
      metadata: { workspaceId: input.workspaceId },
    });

    return {
      success: true,
      data: { voted: false, upvotes: Math.max(0, post.upvotes - 1) },
    };
  } else {
    await addVote(input.postId, session.user.id);

    audit({
      action: "vote.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "post",
      entityId: input.postId,
      description: `Voted on: ${post.title}`,
      metadata: { workspaceId: input.workspaceId },
    });

    return {
      success: true,
      data: { voted: true, upvotes: post.upvotes + 1 },
    };
  }
}
