import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Display typeface for the marketing surface only.
 * Exposed as the CSS variable `--font-display` and applied on the
 * marketing wrapper — the product application keeps Inter (`--font-sans`).
 */
export const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
