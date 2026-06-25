import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "light";
type Size = "md" | "lg";

const BASE =
  "group/cta inline-flex select-none items-center justify-center gap-2 rounded-mk font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-60";

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[0.95rem]",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "mk-btn-fill text-white shadow-mk-brand hover:-translate-y-0.5 hover:shadow-mk-lg",
  secondary:
    "border border-hairline-strong bg-surface text-ink shadow-mk-sm hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700",
  ghost: "text-ink-soft hover:bg-brand-50 hover:text-brand-700",
  light:
    "bg-white text-brand-700 shadow-mk hover:-translate-y-0.5 hover:bg-brand-50",
};

type CtaButtonProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  external?: boolean;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className">;

export function CtaButton({
  href,
  children,
  variant = "primary",
  size = "lg",
  external = false,
  className,
  ...rest
}: CtaButtonProps) {
  return (
    <Link
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
      href={href}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
