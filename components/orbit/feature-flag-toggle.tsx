"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleFeatureFlagAction } from "@/app/actions/orbit-feature-flags";

interface Props {
  flagKey: string;
  isEnabled: boolean;
}

export function FeatureFlagToggle({ flagKey, isEnabled }: Props) {
  const [optimisticEnabled, setOptimistic] = useOptimistic(isEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !optimisticEnabled;
    startTransition(async () => {
      setOptimistic(next);
      const result = await toggleFeatureFlagAction(flagKey, next);
      if (result.error) {
        setOptimistic(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      aria-checked={optimisticEnabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        optimisticEnabled ? "bg-primary" : "bg-muted"
      }`}
      disabled={isPending}
      onClick={toggle}
      role="switch"
      type="button"
    >
      <span
        className={`inline-block size-5 bg-white shadow transition-transform duration-150 ${
          optimisticEnabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
      <span className="sr-only">
        {optimisticEnabled ? "Enabled" : "Disabled"}
      </span>
    </button>
  );
}
