import Link from "next/link";

interface PortalHeaderProps {
  active?: "roadmap" | "changelog";
  // Accepted for API stability, but the Changelog nav link is hidden until a
  // public changelog index exists (deferred — see Phase E). Individual changelog
  // entries remain publicly readable.
  changelogPublic: boolean;
  isSignedIn: boolean;
  roadmapPublic: boolean;
  slug: string;
  workspaceName: string;
}

/**
 * Public-facing header for a brand's feedback portal (board, post, roadmap
 * pages). Mirrors the public changelog header. Reading is open to anyone;
 * signed-in members get a link back to their dashboard, visitors get a sign-in
 * link. Participation (vote/comment/submit) is gated elsewhere.
 */
export function PortalHeader({
  slug,
  workspaceName,
  roadmapPublic,
  isSignedIn,
  active,
}: PortalHeaderProps) {
  const navLinkClass =
    "px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";
  const activeLinkClass =
    "px-3 py-1.5 text-sm font-medium text-foreground border-b-2 border-foreground";

  return (
    <header className="border-b border-border bg-background sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
            href={`/${slug}`}
          >
            {workspaceName}
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {roadmapPublic && (
              <Link
                className={
                  active === "roadmap" ? activeLinkClass : navLinkClass
                }
                href={`/${slug}/roadmap`}
              >
                Roadmap
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              href={`/${slug}`}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              href="/signin"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
