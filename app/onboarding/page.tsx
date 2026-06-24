import { requireSession } from "@/lib/authz";

export const metadata = {
  title: "Set up your workspace",
};

export default async function OnboardingPage() {
  await requireSession();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <p className="text-sm text-muted-foreground">
        Workspace setup — coming in Feature 2.
      </p>
    </main>
  );
}
