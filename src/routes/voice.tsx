import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/hercules/AppShell";
import { Orb } from "@/components/hercules/Orb";
import { DriverApprovedNote } from "@/components/hercules/primitives";
import { useVoice } from "@/lib/voice";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Talk — HERCULES" },
      {
        name: "description",
        content:
          "Talk to HERCULES: ask, follow up, and have your clock, loads, money, and road read aloud. Nothing commits without your explicit yes.",
      },
      { property: "og:title", content: "Talk — HERCULES" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Talk to HERCULES like a partner — hands on the wheel, eyes on the road.",
      },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const { mode, orbState, colorway, listen, stop, voice, lastLine } = useVoice();

  return (
    <AppShell title="Talk" subtitle={`Talking with ${voice.name} — ask, follow up, keep going`}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center justify-center gap-6 p-8">
          <Orb
            className="w-[min(60vw,360px)]"
            mode={mode}
            visualState={orbState}
            colorway={colorway}
            onActivate={mode === "idle" ? listen : stop}
          />
          <div className="text-center">
            <p className="tech-label">
              {mode === "listening"
                ? "Listening"
                : mode === "speaking"
                  ? `${voice.name} speaking`
                  : "Tap the orb or say “Hercules”"}
            </p>
            <p className="mt-3 max-w-[42ch] text-[0.98rem] font-light leading-relaxed text-muted-foreground">
              {mode === "listening" ? "Go ahead, I'm on it." : lastLine || "Ask about loads, hours, the map or money."}
            </p>
          </div>
        </div>

        <DriverApprovedNote>
          Voice can propose and read anything aloud, but booking, spending, or committing always
          waits for your explicit yes.
        </DriverApprovedNote>
      </div>
    </AppShell>
  );
}
