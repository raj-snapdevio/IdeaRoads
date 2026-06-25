import { GitFork, Server, Users } from "lucide-react";
import { CopyButton } from "@/components/marketing/copy-button";
import { CtaButton } from "@/components/marketing/cta-button";
import { GITHUB_REPO_URL } from "@/config/platform";

const PILLARS = [
  {
    Icon: GitFork,
    title: "MIT licensed",
    body: "Read the code, fork it, contribute back. No black boxes, no lock-in.",
  },
  {
    Icon: Server,
    title: "One command to self-host",
    body: "Runs on your own server. Your data never leaves your infrastructure.",
  },
  {
    Icon: Users,
    title: "Voters are always free",
    body: "Pricing is per team seat only. The people giving you feedback never cost a cent.",
  },
] as const;

const COMMAND = "docker compose up -d";

export function OpenSource() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-mk-2xl bg-ink px-6 py-14 shadow-mk-xl sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="mk-dotgrid absolute inset-0 opacity-[0.4] mask-[radial-gradient(80%_80%_at_50%_0%,black,transparent)]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/25 blur-3xl"
          />

          <div className="relative">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
                Open source &amp; self-hosted
              </span>
              <h2 className="mk-display mt-5 text-3xl font-bold text-white sm:text-4xl">
                You own your data. Always.
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/70">
                IdeaRoads is fully open source and runs anywhere Docker does.
                Host it yourself in minutes — or let us manage it for you.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {PILLARS.map(({ Icon, title, body }) => (
                <div
                  className="rounded-mk-xl border border-white/10 bg-white/[0.04] p-6"
                  key={title}
                >
                  <span className="flex size-11 items-center justify-center rounded-mk bg-white/10 text-brand-200">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mk-display mt-4 text-lg font-bold text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-mk-lg border border-white/10 bg-black/30 px-4 py-3 font-mono">
                <span className="truncate text-sm text-white/85">
                  <span className="text-brand-200">$</span> {COMMAND}
                </span>
                <CopyButton text={COMMAND} />
              </div>
              <CtaButton
                external
                href={GITHUB_REPO_URL}
                size="md"
                variant="light"
              >
                <GitFork aria-hidden="true" className="size-4" />
                Star on GitHub
              </CtaButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
