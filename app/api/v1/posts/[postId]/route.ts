import { type NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { getPost } from "@/lib/posts/queries";

// GET /api/v1/posts/:postId — fetch a single post in the API key's workspace.
// Auth: `Authorization: Bearer <api-key>` (or `x-api-key`).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key." },
      { status: 401 }
    );
  }

  const { postId } = await params;
  const post = await getPost(postId);

  // Scope strictly to the key's workspace — never leak cross-tenant posts.
  if (!post || post.workspaceId !== auth.workspaceId || !post.isApproved) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      body: post.body,
      status: post.status,
      upvotes: post.upvotes,
      commentCount: post.commentCount,
      boardId: post.boardId,
      categoryId: post.categoryId,
      createdAt: post.createdAt,
    },
  });
}
