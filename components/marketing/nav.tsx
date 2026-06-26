import Image from "next/image";
import Link from "next/link";
import { NavFeaturesDropdown } from "@/components/marketing/nav-features-dropdown";
import { Button } from "@/components/ui/button";
import { LOGO_PATH, PRODUCT_NAME } from "@/config/platform";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <Image
            alt={PRODUCT_NAME}
            className="h-10 w-auto"
            height={164}
            priority
            src={LOGO_PATH}
            width={500}
          />
        </Link>

        <nav
          aria-label="Site navigation"
          className="hidden items-center gap-1 md:flex"
        >
          <NavFeaturesDropdown />

          <Link
            className="rounded-none px-3 py-2 text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            href="/demo"
          >
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Start Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
