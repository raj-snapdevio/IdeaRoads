"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ImpersonateBannerClient({ email }: { email: string }) {
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();

  async function handleEndImpersonation() {
    setIsEnding(true);
    try {
      await authClient.admin.stopImpersonating();
      router.push("/orbit");
      router.refresh();
    } catch {
      setIsEnding(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-4 border-b border-amber-400/40 bg-amber-50 px-4 py-2.5 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="text-base">⚠</span>
        <span className="font-semibold">Impersonating</span>
        <span className="font-mono text-xs opacity-80">{email}</span>
      </div>
      <button
        className="shrink-0 rounded-none border border-amber-400/60 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-ui text-amber-900 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800"
        disabled={isEnding}
        onClick={handleEndImpersonation}
        type="button"
      >
        {isEnding ? "Ending…" : "End Impersonation"}
      </button>
    </div>
  );
}
