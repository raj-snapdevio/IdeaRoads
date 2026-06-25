import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/authz";
import { markNotificationAsRead } from "@/lib/notifications/queries";

interface Params {
  params: Promise<{ notificationId: string }>;
}

export async function PATCH(_req: Request, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await params;
  await markNotificationAsRead(notificationId, session.user.id);
  return NextResponse.json({ ok: true });
}
