import { NextRequest, NextResponse } from "next/server";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getPost } from "@/lib/posts/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";
import {
  CommentBlockedError,
  CommentNotFoundError,
  createComment,
  listComments,
} from "@/lib/comments";

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

  let body: {
    body?: string;
    parentId?: string;
    authorEmail?: string;
    authorName?: string;
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

  // Guest validation
  if (!session) {
    if (!body.authorEmail) {
      return NextResponse.json(
        { error: "Email is required to comment as a guest." },
        { status: 422 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.authorEmail) || body.authorEmail.length > 255) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 422 }
      );
    }
    if (!body.authorName || body.authorName.trim().length < 1) {
      return NextResponse.json(
        { error: "Name is required to comment as a guest." },
        { status: 422 }
      );
    }
    if (body.authorName.trim().length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or fewer." },
        { status: 422 }
      );
    }
  }

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  try {
    const comment = await createComment(
      postId,
      {
        body: rawBody,
        parentId: body.parentId ?? null,
        authorId: session?.user.id ?? null,
        authorEmail: session ? session.user.email : (body.authorEmail ?? null),
        authorName: session
          ? (session.user.name ?? null)
          : (body.authorName?.trim() ?? null),
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
        isGuest: !session,
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
