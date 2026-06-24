import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/onboarding/_components/onboarding-form";
import { requireSession } from "@/lib/authz";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export const metadata = {
  title: "Create your workspace",
};

export default async function OnboardingPage() {
  const session = await requireSession();

  // Redirect if the user already has a workspace
  const existing = await getFirstUserWorkspace(session.user.id);
  if (existing) {
    redirect(`/${existing.slug}`);
  }

  const appUrl = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  );
  const appHost = appUrl.hostname + (appUrl.port ? `:${appUrl.port}` : "");

  return <OnboardingForm appHost={appHost} />;
}
