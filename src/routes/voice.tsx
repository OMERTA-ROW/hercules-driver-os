import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mic, Volume2, Hand, Ear } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Pill, DriverApprovedNote } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transcript, voiceCommands } from "@/data/mock";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Interface — HERCULES" },
      {
        name: "description",
        content:
          "Run the whole truck by voice: ask about your clock, loads, parking, faults, and margin. HERCULES answers out loud, hands on the wheel.",
      },
      { property: "og:title", content: "Voice Interface — HERCULES" },
      {
        property: "og:description",
        content: "Hands on the wheel, eyes on the road. Speak and HERCULES reads your data aloud.",
      },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const [listening, setListening] = useState(false);
  const [lines, setLines] = useState(transcript);

  function say(phrase: string) {
    setLines((prev) => [
      ...prev,
      { from: "driver" as const, text: phrase },
      {
        from: "hercules" as const,
        text:
          "Here's what I have on that. Reading it back now — say “details” for the full breakdown, or “that's all” to stop. I won't change anything without your say-so.",
      },
    ]);
  }

  return (
    <AppShell
      title="Voice Interface"
      subtitle="The primary way to run HERCULES — hands on the wheel, eyes on the road"
    >
      <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
        <Panel className="flex flex-col items-center justify-center py-10">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Start listening"}
            onClick={() => setListening((v) => !v)}
            className={cn(
              "flex h-44 w-44 items-center justify-center rounded-full border-4 transition-all sm:h-56 sm:w-56",
              listening
                ? "glow-ring animate-pulse border-primary bg-primary text-primary-foreground"
                : "border-primary/60 bg-secondary text-primary hover:bg-primary/15",
            )}
          >
            <Mic className="h-20 w-20 sm:h-24 sm:w-24" />
          </button>
          <div className="mt-5 text-center">
            <div className="font-display text-2xl uppercase tracking-[0.14em]">
              {listening ? "Listening" : "Tap or say “Hercules”"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {listening
                ? "Speak naturally — road noise filtered"
                : "Wake word stays active while the truck is running"}
            </p>
          </div>
          {listening ? (
            <div className="mt-5 flex items-end gap-1.5">
              {Array.from({ length: 22 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 animate-pulse rounded-full bg-primary"
                  style={{ height: `${8 + ((i * 13) % 44)}px`, animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Pill tone="go">
              <Hand className="h-3.5 w-3.5" /> Hands-free
            </Pill>
            <Pill tone="info">
              <Ear className="h-3.5 w-3.5" /> Reads data aloud
            </Pill>
            <Pill tone="primary">
              <Volume2 className="h-3.5 w-3.5" /> Cab-noise tuned
            </Pill>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel>
            <PanelTitle right={<Pill tone="neutral">Live</Pill>}>Transcript</PanelTitle>
            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {lines.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm leading-relaxed",
                    l.from === "driver"
                      ? "border-border bg-secondary"
                      : "border-primary/35 bg-primary/8",
                  )}
                >
                  <Label className="mb-1">{l.from === "driver" ? "You" : "Hercules"}</Label>
                  {l.text}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <DriverApprovedNote>
                Voice never commits anything on its own. HERCULES will always read back the plan and
                wait for your yes.
              </DriverApprovedNote>
            </div>
          </Panel>

          <Panel>
            <PanelTitle right={<Pill tone="primary">Tap to try</Pill>}>Example Commands</PanelTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {voiceCommands.map((c) => (
                <Button
                  key={c.phrase}
                  variant="outline"
                  size="lg"
                  className="h-auto flex-col items-start gap-1 whitespace-normal py-3 text-left"
                  onClick={() => say(c.phrase)}
                >
                  <span className="font-semibold text-primary">“{c.phrase}”</span>
                  <span className="text-xs font-normal text-muted-foreground">{c.desc}</span>
                </Button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
