import type { ReactNode } from "react";
import { displayFont } from "@/components/marketing/fonts";
import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";
import { cn } from "@/lib/utils";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        displayFont.variable,
        "min-h-screen bg-canvas text-ink antialiased"
      )}
    >
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
