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

  if (voteCount === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-2xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        See who voted
      </button>

      {open && (
        <VoterListModal
          postId={postId}
          voteCount={voteCount}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
