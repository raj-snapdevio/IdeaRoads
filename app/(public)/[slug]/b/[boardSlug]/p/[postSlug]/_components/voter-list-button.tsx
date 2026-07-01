"use client";

import { useState } from "react";
import VoterListModal from "@/components/voting/voter-list-modal";

interface VoterListButtonProps {
  postId: string;
  voteCount: number;
}

export default function VoterListButton({
  postId,
  voteCount,
}: VoterListButtonProps) {
  const [open, setOpen] = useState(false);

  if (voteCount === 0) {
    return null;
  }

  return (
    <>
      <button
        className="text-2xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        onClick={() => setOpen(true)}
      >
        See who voted
      </button>

      {open && (
        <VoterListModal
          onClose={() => setOpen(false)}
          postId={postId}
          voteCount={voteCount}
        />
      )}
    </>
  );
}
