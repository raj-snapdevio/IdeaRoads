import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { FeatureFlagToggle } from "@/components/orbit/feature-flag-toggle";
import { listFeatureFlags } from "@/lib/orbit/feature-flags";

export const metadata = { title: "Feature Flags" };

export default async function FeatureFlagsPage() {
  const flags = await listFeatureFlags();

  return (
    <div>
      <OrbitPageHeader
        description="Toggle platform-wide boolean features. Changes propagate within 60 seconds."
        eyebrow="Orbit"
        title="Feature Flags"
      />

      <div className="border border-border bg-card">
        {flags.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No feature flags yet. Start the worker to seed defaults.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {flags.map((flag) => (
              <div
                className="flex items-center justify-between gap-4 px-6 py-4"
                key={flag.key}
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">{flag.key}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
                <FeatureFlagToggle
                  flagKey={flag.key}
                  isEnabled={flag.isEnabled}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
