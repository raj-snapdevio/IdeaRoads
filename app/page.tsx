import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Comparison } from "@/components/marketing/comparison";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { displayFont } from "@/components/marketing/fonts";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { LiveDemo } from "@/components/marketing/live-demo";
import { LogosStrip } from "@/components/marketing/logos-strip";
import { Nav } from "@/components/marketing/nav";
import { OpenSource } from "@/components/marketing/open-source";
import { ProblemFraming } from "@/components/marketing/problem-framing";
import { ProductTour } from "@/components/marketing/product-tour";
import { SocialProof } from "@/components/marketing/social-proof";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — Collect feedback, ship faster, close the loop`,
  description:
    "Customer feedback boards, voting, public roadmap, and changelog for product teams. Notify every voter automatically when you ship.",
};

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div
      className={cn(
        displayFont.variable,
        "min-h-screen bg-canvas text-ink antialiased"
      )}
    >
      <Nav />
      <main>
        <Hero />
        <LogosStrip />
        <ProblemFraming />
        <ProductTour />
        <FeaturesGrid />
        <LiveDemo />
        <Comparison />
        <SocialProof />
        <OpenSource />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
