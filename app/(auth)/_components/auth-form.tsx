"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LOGO_PATH, PRODUCT_NAME } from "@/config/platform";
import { signIn, useSession } from "@/lib/auth-client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const URL_ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN:
    "This sign-in link has expired or has already been used. Please request a new one.",
  EXPIRED_TOKEN: "This sign-in link has expired. Please request a new one.",
  access_denied: "Sign-in was cancelled.",
  OAuthAccountNotLinked:
    "An account with this email already exists. Please sign in using your original method.",
};

interface AuthFormProps {
  googleEnabled: boolean;
}

export function AuthForm({ googleEnabled }: AuthFormProps) {
  return (
    <Suspense fallback={null}>
      <AuthFormInner googleEnabled={googleEnabled} />
    </Suspense>
  );
}

function AuthFormInner({ googleEnabled }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const urlErrorCode = searchParams.get("error");
  const urlError = urlErrorCode
    ? (URL_ERROR_MESSAGES[urlErrorCode] ??
      "Something went wrong. Please try again.")
    : null;

  const callbackURL = searchParams.get("next") ?? "/post-auth";

  useEffect(() => {
    if (session) {
      router.replace("/post-auth");
    }
  }, [router, session]);

  if (isPending || session) {
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = await signIn.magicLink({ callbackURL, email });

    setSubmitting(false);
    if (result.error) {
      setFormError(
        result.error.message ?? "Something went wrong. Please try again."
      );
      return;
    }
    setSent(true);
  }

  async function handleGoogleSignIn() {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const result = await signIn.social({ provider: "google", callbackURL });
      if (result?.error) {
        setFormError(
          result.error.message ?? "Google sign-in failed. Please try again."
        );
        setGoogleLoading(false);
      }
    } catch {
      setFormError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          className="mb-8 flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <Image
            alt={PRODUCT_NAME}
            className="h-9 w-auto"
            height={164}
            priority
            src={LOGO_PATH}
            width={500}
          />
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              {sent ? "Check your email" : "Welcome to IdeaRoads"}
            </CardTitle>
            <CardDescription>
              {sent
                ? "Your sign-in link is on its way. Click it to continue."
                : "Sign in or create a free account - no password needed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="bg-success-subtle p-3 text-sm text-success-foreground">
                  Sign-in link sent to <strong>{email}</strong>. Check your
                  inbox and spam folder.
                </p>
                <Button
                  className="w-full"
                  onClick={() => setSent(false)}
                  type="button"
                  variant="outline"
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {urlError && (
                  <p className="bg-destructive/10 p-3 text-sm text-destructive">
                    {urlError}
                  </p>
                )}

                <form className="space-y-4" onSubmit={onSubmit}>
                  <label className="block" htmlFor="email">
                    <span className="mb-2 block text-sm font-semibold text-foreground">
                      Email
                    </span>
                    <Input
                      autoComplete="email"
                      id="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </label>
                  {formError && (
                    <p className="bg-destructive/10 p-3 text-sm text-destructive">
                      {formError}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Button
                      className="w-full"
                      disabled={submitting || googleLoading}
                      type="submit"
                    >
                      {submitting ? "Sending…" : "Continue with email"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      New here? We'll create your account automatically.
                    </p>
                  </div>
                </form>

                {googleEnabled && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold uppercase tracking-ui text-muted-foreground">
                        or
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <Button
                      className="w-full gap-2"
                      disabled={submitting || googleLoading}
                      onClick={handleGoogleSignIn}
                      type="button"
                      variant="outline"
                    >
                      <GoogleIcon className="size-4" />
                      {googleLoading ? "Redirecting…" : "Continue with Google"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
