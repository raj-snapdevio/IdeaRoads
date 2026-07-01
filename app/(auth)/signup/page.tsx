import { redirect } from "next/navigation";

// Sign up and sign in are the same passwordless flow — there is no separate
// registration form (PLATFORM.md / Feature 01). /signup forwards to /signin.
export default function SignupPage() {
  redirect("/signin");
}
