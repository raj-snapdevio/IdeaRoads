import { NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { audit } from "@/lib/audit";
import {
  getCommentById,
  deleteComment,
  CommentDeleteError,
} from "@/lib/comments";
import { getPost } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ commentId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const comment = await getCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const post = await getPost(comment.postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const member = await getWorkspaceMember(post.workspaceId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await deleteComment(commentId, session.user.id, member.role);
  } catch (err) {
    if (err instanceof CommentDeleteError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[DELETE /api/comments/[commentId]]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }

  audit({
    action: "comment.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "post",
    entityId: comment.postId,
    description: "Deleted comment",
    metadata: { commentId, workspaceId: post.workspaceId },
  });

  return new NextResponse(null, { status: 204 });
}
