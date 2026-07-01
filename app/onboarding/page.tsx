import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/onboarding/_components/onboarding-form";
import { requireSession } from "@/lib/authz";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export const metadata = {
  title: "Create your workspace",
};

interface OnboardingPageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const session = await requireSession();
  const { new: isNew } = await searchParams;

  // Redirect if the user already has a workspace — unless they explicitly asked
  // to create another one (via the workspace switcher's "Create workspace").
  if (!isNew) {
    const existing = await getFirstUserWorkspace(session.user.id);
    if (existing) {
      redirect(`/${existing.slug}`);
    }
  }

  const appUrl = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  );
  const appHost = appUrl.hostname + (appUrl.port ? `:${appUrl.port}` : "");

  return <OnboardingForm appHost={appHost} isAdditional={!!isNew} />;
}
