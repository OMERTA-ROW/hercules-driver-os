import { createFileRoute } from "@tanstack/react-router";
import { LiveOrb } from "@/components/hercules/Orb";
import { DotMenu } from "@/components/hercules/DotMenu";
import { useVoice } from "@/lib/voice";


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
      {
        property: "og:description",
        content: "Talk to it like a partner. It proposes, you decide.",
      },
    ],
  }),
  component: OrbHome,
});

/**
 * HOME = THE ORB. Nothing else visible but a discreet three-dot menu.
 * Every other surface in the app is reachable by voice or through that menu.
 */
function OrbHome() {
  const { mode, voice, lastLine } = useVoice();
  const live = mode !== "idle";

  return (
    <main className="orb-canvas relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute right-4 top-4 z-30">
        <DotMenu />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <LiveOrb className="w-[min(74vw,min(62vh,520px))]" />
      </div>

      {/* One quiet line of state — the spoken word, written down. */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-10 text-center">
        <p className="tech-label">
          {mode === "listening"
            ? "Listening"
            : mode === "speaking"
              ? `${voice.name} speaking`
              : "Say “Hercules”"}
        </p>
        {live || lastLine ? (
          <p className="mt-3 text-[0.98rem] font-light leading-relaxed text-foreground/70">
            {mode === "listening" ? "" : lastLine}
          </p>
        ) : null}
      </div>
    </main>

  );
}
