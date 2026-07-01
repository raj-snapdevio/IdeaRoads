import { type NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import {
  CommentBlockedError,
  CommentNotFoundError,
  createComment,
  listComments,
} from "@/lib/comments";
import { isPostAccessible } from "@/lib/posts/access";
import { getPost } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Comments on private-board posts are visible only to workspace members.
  if (!(await isPostAccessible(post, session?.user.id ?? null))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isAdmin =
    session &&
    (await getWorkspaceMember(post.workspaceId, session.user.id).then(
      (m) => m && m.role !== WORKSPACE_MEMBER
    ));

  const includeUnapprovedParam =
    req.nextUrl.searchParams.get("includeUnapproved") === "true";
  const includeUnapproved = !!(isAdmin && includeUnapprovedParam);

  const threadedComments = await listComments(postId, { includeUnapproved });

  // Sanitize: never return author_email
  const sanitized = threadedComments.map((c) => ({
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    body: c.body,
    isDeleted: c.isDeleted,
    isApproved: c.isApproved,
    authorName: c.isDeleted ? null : c.authorName,
    authorAvatar: c.isDeleted ? null : c.authorAvatar,
    isGuest: !c.authorId,
    createdAt: c.createdAt,
    replies: c.replies.map((r) => ({
      id: r.id,
      postId: r.postId,
      parentId: r.parentId,
      body: r.body,
      isDeleted: r.isDeleted,
      isApproved: r.isApproved,
      authorName: r.isDeleted ? null : r.authorName,
      authorAvatar: r.isDeleted ? null : r.authorAvatar,
      isGuest: !r.authorId,
      createdAt: r.createdAt,
    })),
  }));

  return NextResponse.json(sanitized);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  // Commenting requires a signed-in User — there is no anonymous/guest commenting.
  if (!session) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  let body: {
    body?: string;
    parentId?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validate body
  const rawBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!rawBody || rawBody.length < 1 || rawBody.length > 5000) {
    return NextResponse.json(
      { error: "Comment must be between 1 and 5000 characters." },
      { status: 422 }
    );
  }

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Private-board posts accept comments only from workspace members.
  if (!(await isPostAccessible(post, session.user.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  try {
    const comment = await createComment(
      postId,
      {
        body: rawBody,
        parentId: body.parentId ?? null,
        authorId: session.user.id,
        authorEmail: session.user.email,
        authorName: session.user.name ?? null,
        authorAvatar: null,
      },
      post.workspaceId
    );

    return NextResponse.json(
      {
        id: comment.id,
        postId: comment.postId,
        parentId: comment.parentId,
        body: comment.body,
        isApproved: comment.isApproved,
        isDeleted: false,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        isGuest: false,
        createdAt: comment.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    if (
      err instanceof CommentNotFoundError ||
      err instanceof CommentBlockedError
    ) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[POST /api/posts/[postId]/comments]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
