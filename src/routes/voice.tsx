import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { Orb } from "@/components/hercules/Orb";
import { Conversation } from "@/components/hercules/Conversation";
import { DriverApprovedNote } from "@/components/hercules/primitives";
import { useVoice } from "@/lib/voice";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Conversation — HERCULES" },
      {
        name: "description",
        content:
          "A continuous conversation with HERCULES: ask, follow up, and have your clock, loads, money, and road read aloud. Nothing commits without your explicit yes.",
      },
      { property: "og:title", content: "Conversation — HERCULES" },
      {
        property: "og:description",
        content: "Talk to HERCULES like a partner — hands on the wheel, eyes on the road.",
      },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const { mode, colorway, listen, stop, clear, voice, turns } = useVoice();

  return (
    <AppShell
      title="Conversation"
      subtitle={`Talking with ${voice.name} — ask, follow up, keep going`}
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass flex flex-col items-center justify-center gap-6 p-8">
          <Orb
            className="w-[min(52vw,300px)]"
            mode={mode}
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
            <p className="mt-2 max-w-[34ch] text-sm font-light text-muted-foreground">
              It holds the thread — ask a follow-up like “how much?” or “book it” and it knows what
              you mean.
            </p>
          </div>
        </div>

        <div className="glass flex min-h-[52vh] flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="tech-label">Conversation</span>
            {turns.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="tech-label flex items-center gap-2 rounded-full hairline px-4 py-2"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <Conversation />
          </div>
          <div className="mt-4">
            <DriverApprovedNote>
              Voice can propose and read anything aloud, but booking, spending, or committing always
              waits for your explicit yes.
            </DriverApprovedNote>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
