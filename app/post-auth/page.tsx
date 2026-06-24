import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export default async function PostAuthPage() {
  const session = await requireSession();
  const [freshUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (freshUser?.role === ADMIN_ROLE) {
    redirect("/orbit");
  }

  const workspace = await getFirstUserWorkspace(session.user.id);

  redirect(workspace ? `/${workspace.slug}` : "/onboarding");
}
