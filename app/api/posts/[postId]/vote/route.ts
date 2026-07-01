import { type NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getCurrentSession } from "@/lib/authz";
import { isPostAccessible } from "@/lib/posts/access";
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

export async function POST(_req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  // Voting requires a signed-in User — there is no anonymous/guest voting.
  if (!session) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }

  // Get post to find workspaceId
  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Private-board posts are reachable only by workspace members.
  if (!(await isPostAccessible(post, session.user.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  try {
    const voter = { userId: session.user.id };

    const existingVote = await import("@/lib/voting/list").then((m) =>
      m.hasUserVoted(postId, voter)
    );

    const vote = await castVote(postId, post.workspaceId, voter);

    audit({
      action: "vote.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "post",
      entityId: postId,
      description: `Voted on: ${post.title}`,
      metadata: { workspaceId: post.workspaceId },
    });

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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { postId } = await params;
  const session = await getCurrentSession();

  // Removing a vote requires a signed-in User — there is no guest vote removal.
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to manage your vote." },
      { status: 401 }
    );
  }

  const post = await getPost(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Private-board posts are reachable only by workspace members.
  if (!(await isPostAccessible(post, session.user.id))) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

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
