import { OrbitPageHeader } from "@/components/admin/orbit-page-header";

export const metadata = { title: "Plans" };

export default function OrbitPlansPage() {
  return (
    <div>
      <OrbitPageHeader
        description="Manage subscription plan tiers and workspace assignments."
        eyebrow="Orbit"
        title="Plans"
      />

      <div className="flex flex-col items-center justify-center border border-dashed border-border bg-card px-8 py-16 text-center">
        <div className="mb-4 grid size-12 place-items-center border border-border bg-muted text-muted-foreground text-xl">
          📋
        </div>
        <h2 className="font-semibold text-base">Plans & Billing</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The billing and subscription system is not yet implemented. This
          section will allow you to define plan tiers, set limits, and assign
          plans to workspaces.
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-ui text-muted-foreground">
          Coming in a future release
        </p>
      </div>
    </div>
  );
}
