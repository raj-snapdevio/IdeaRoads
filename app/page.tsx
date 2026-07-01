import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Comparison } from "@/components/marketing/comparison";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { LiveDemo } from "@/components/marketing/live-demo";
import { Nav } from "@/components/marketing/nav";
import { ProblemFraming } from "@/components/marketing/problem-framing";
import { ProductTour } from "@/components/marketing/product-tour";
import { LOGO_PATH, PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";

const TITLE = `${PRODUCT_NAME} — Collect feedback, ship faster, close the loop`;
const DESCRIPTION =
  "Customer feedback boards, voting, public roadmap, and changelog for product teams. Notify every voter automatically when you ship.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: PRODUCT_NAME,
    type: "website",
    images: [{ url: LOGO_PATH }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [LOGO_PATH],
  },
};

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/post-auth");
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        {/* <TrustBar /> */}
        <ProblemFraming />
        <ProductTour />
        <FeaturesGrid />
        <LiveDemo />
        <Comparison />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
