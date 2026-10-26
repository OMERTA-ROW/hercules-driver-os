import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { DotMenu } from "@/components/hercules/DotMenu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HERCULES — Voice-First Driver OS" },
      {
        name: "description",
        content:
          "One orb, one conversation. HERCULES runs the truck by voice — clock, loads, money, road ahead — and never commits anything without your word.",
      },
      { property: "og:title", content: "HERCULES — Voice-First Driver OS" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Talk to it like a partner. It proposes, you decide.",
      },
    ],
  }),
  component: OrbHome,
});

/** The shared root owns the one conversation; this route supplies navigation. */
function OrbHome() {
  return (
    <main className="conversation-home min-h-dvh bg-background">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <h1 className="font-display text-xl font-medium text-primary">HERCULES</h1>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/dashboard" className="home-status-link inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
            Dashboard <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <DotMenu />
        </div>
      </header>
    </main>
  );
}
