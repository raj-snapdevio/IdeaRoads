"use client";

import { Bell, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleRoadmapFollowAction } from "@/app/actions/roadmap";

interface FollowRoadmapButtonProps {
  initialFollowing: boolean;
  isSignedIn: boolean;
  workspaceId: string;
}

export function FollowRoadmapButton({
  workspaceId,
  initialFollowing,
  isSignedIn,
}: FollowRoadmapButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Following requires sign-in — send visitors to sign in first (Feature 09).
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    const next = !following;
    startTransition(async () => {
      const result = await toggleRoadmapFollowAction({
        workspaceId,
        follow: next,
      });
      if (result.success) {
        setFollowing(next);
        toast.success(
          next ? "You're following this roadmap" : "Unfollowed roadmap"
        );
      } else if (result.code === "UNAUTHENTICATED") {
        router.push("/login");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <button
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
        following
          ? "border-border bg-muted text-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {following ? (
        <BellRing className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}
