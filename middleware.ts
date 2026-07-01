import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    const signinUrl = new URL("/signin", request.url);
    signinUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/orbit/:path*",
    "/account/:path*",
    "/onboarding/:path*",
    "/post-auth/:path*",
    "/invite/link/:path*",
  ],
};
