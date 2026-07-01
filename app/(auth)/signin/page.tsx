import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";

export const metadata = {
  title: "Get started",
};

export default async function LoginPage() {
  // Google sign-in requires both OAuth credentials AND the platform-wide
  // `google_auth` feature flag (an Orbit Admin can disable it without a deploy).
  const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const googleEnabled =
    googleConfigured && (await isFeatureEnabled("google_auth"));
  return <AuthForm googleEnabled={googleEnabled} />;
}
