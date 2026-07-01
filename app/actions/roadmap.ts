"use server";

import { getCurrentSession } from "@/lib/authz";
import {
  followRoadmap,
  isFollowingRoadmap,
  unfollowRoadmap,
} from "@/lib/roadmap/followers";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Following the roadmap requires a signed-in User (Feature 09). A not-signed-in
// visitor is prompted to sign in (the client returns code "UNAUTHENTICATED").
export async function toggleRoadmapFollowAction(input: {
  workspaceId: string;
  follow: boolean;
}): Promise<ActionResult<{ following: boolean }>> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sign in to follow the roadmap.",
      code: "UNAUTHENTICATED",
    };
  }

  if (input.follow) {
    await followRoadmap(input.workspaceId, session.user.id);
  } else {
    await unfollowRoadmap(input.workspaceId, session.user.id);
  }

  return { success: true, data: { following: input.follow } };
}

export async function getRoadmapFollowStateAction(
  workspaceId: string
): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) {
    return false;
  }
  return isFollowingRoadmap(workspaceId, session.user.id);
}
