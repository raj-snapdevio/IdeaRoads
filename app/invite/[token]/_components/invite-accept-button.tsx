"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptInviteAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

export function InviteAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await acceptInviteAction(token);
    if (!result.success) {
      setLoading(false);
      setError(result.error);
      return;
    }
    router.push(`/${result.data.slug}`);
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="w-full"
        disabled={loading}
        onClick={handleAccept}
        type="button"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Accepting…
          </span>
        ) : (
          "Accept invitation"
        )}
      </Button>
    </div>
  );
}
