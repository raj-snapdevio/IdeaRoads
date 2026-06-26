import { type NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { getPost } from "@/lib/posts/queries";
import {
  castVote,
  removeVote,
  VoteBlockedError,
  VoteNotFoundError,
} from "@/lib/voting";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  // Parse body (empty for signed-in, email+name for guests)
  let body: { email?: string; name?: string } = {};
  try {
    const text = await req.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    // empty body is fine for signed-in users
  }

  if (!session && !body.email) {
    return NextResponse.json(
      { error: "Please enter your email to vote." },
      { status: 422 }
    );
  }

  if (!session && body.email) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email) || body.email.length > 255) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 422 }
      );
    }
  }

  // Get post to find workspaceId
  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  try {
    const voter = session
      ? { userId: session.user.id }
      : { userEmail: body.email!, userName: body.name ?? undefined };

    const existingVote = await import("@/lib/voting/list").then((m) =>
      m.hasUserVoted(postId, voter)
    );

    const vote = await castVote(postId, post.workspaceId, voter);

    if (session) {
      audit({
        action: "vote.created",
        actorId: session.user.id,
        actorEmail: session.user.email,
        entityType: "post",
        entityId: postId,
        description: `Voted on: ${post.title}`,
        metadata: { workspaceId: post.workspaceId },
      });
    }

    // Refetch updated vote count
    const updated = await getPost(postId);
    const voteCount = updated?.upvotes ?? post.upvotes;

    const status = existingVote ? 200 : 201;
    return NextResponse.json({ voteId: vote?.id, voteCount }, { status });
  } catch (err) {
    if (err instanceof VoteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof VoteBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[POST /api/posts/[postId]/vote]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (session) {
    await removeVote(postId, { userId: session.user.id });

    audit({
      action: "vote.removed",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "post",
      entityId: postId,
      description: `Removed vote from: ${post.title}`,
      metadata: { workspaceId: post.workspaceId },
    });

    return new NextResponse(null, { status: 204 });
  }

  // Guest: requires ?email= query param
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Email query param required for guest vote removal." },
      { status: 422 }
    );
  }

  // Verify vote exists before deleting (prevent IDOR)
  const { hasUserVoted } = await import("@/lib/voting/list");
  const exists = await hasUserVoted(postId, { userEmail: email });
  if (!exists) {
    return NextResponse.json({ error: "Vote not found." }, { status: 404 });
  }

  await removeVote(postId, { userEmail: email });
  return new NextResponse(null, { status: 204 });
}
