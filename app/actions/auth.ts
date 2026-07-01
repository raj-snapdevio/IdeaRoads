"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";

export async function logoutAction() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  await auth.api.signOut({ headers: requestHeaders });

  // Explicitly delete the session cookie so the browser does not retain it
  // after this server action (Set-Cookie from auth.api.signOut is not
  // automatically forwarded to the response in a Next.js server action context).
  const cookieStore = await cookies();
  cookieStore.delete("better-auth.session_token");

  if (session) {
    await audit({
      action: "auth.logout",
      actorEmail: session.user.email,
      actorId: session.user.id,
      description: `User logged out: ${session.user.email}`,
      entityId: session.user.id,
      entityType: "user",
    });
  }

  redirect("/signin");
}
