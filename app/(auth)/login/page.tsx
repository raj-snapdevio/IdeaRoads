import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { env } from "@/lib/env";

export const metadata = {
  title: "Get started",
};

export default function LoginPage() {
  const googleEnabled = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return <AuthForm googleEnabled={googleEnabled} />;
}
