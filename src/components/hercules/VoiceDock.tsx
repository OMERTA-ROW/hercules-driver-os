import { useEffect, useState } from "react";
import { Mic, MicOff, Volume2, ChevronUp, ChevronDown, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transcript as seedTranscript, voiceCommands } from "@/data/mock";
import { Label } from "./primitives";
import { BrightnessButton } from "./ThemeToggle";

type Line = { from: "driver" | "hercules"; text: string };

const cannedReplies: Line[] = [
  {
    from: "hercules",
    text: "You have 4 hours 6 minutes of drive time left and 214 miles to Oklahoma City. ETA 19:42 with 1 hour 48 minutes of slack.",
  },
  {
    from: "hercules",
    text: "Current run is netting $2.43 per mile after fuel, tolls, and fixed cost. That is above your 30-day average of $2.11.",
  },
  {
    from: "hercules",
    text: "Best load on the board is Tulsa to Denver at $4.72 per mile. Shipper is a 24-hour facility with on-site overnight parking. Want me to pull up the details? I will not book anything without your approval.",
  },
];

/**
 * VOICE DOCK — built for a dark cab.
 * No white panels, no bright fills. Warm amber-gray type on near-black,
 * and the listening state reads as a slow pulsing glow, never a flash.
 */
export function VoiceDock() {
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(seedTranscript);
  const [replyIdx, setReplyIdx] = useState(0);

  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => {
      const reply = cannedReplies[replyIdx % cannedReplies.length]!;
      setLines((prev) => [
        ...prev,
        { from: "driver", text: "Hercules, how am I doing?" },
        reply,
      ]);
      setReplyIdx((i) => i + 1);
      setListening(false);
      setOpen(true);
    }, 2600);
    return () => clearTimeout(t);
  }, [listening, replyIdx]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto w-full max-w-[1800px] px-3 pb-3 sm:px-4 sm:pb-4">
        {open ? (
          <div className="voice-surface mb-2 max-h-[46vh] overflow-y-auto p-4">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <Label className="mb-2 text-voice-text-dim">Transcript</Label>
                <div className="space-y-2">
                  {lines.slice(-8).map((l, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-base leading-relaxed",
                        l.from === "driver"
                          ? "border-voice-line bg-voice-accent-soft/12 text-voice-text-dim"
                          : "border-voice-accent/30 bg-voice-accent/8 text-voice-text",
                      )}
                    >
                      <span className="label-cap mr-2 text-voice-accent">
                        {l.from === "driver" ? "You" : "Hercules"}
                      </span>
                      {l.text}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 text-voice-text-dim">Try saying</Label>
                <ul className="space-y-1.5">
                  {voiceCommands.slice(0, 6).map((c) => (
                    <li
                      key={c.phrase}
                      className="rounded-md border border-voice-line px-3 py-1.5 text-sm"
                    >
                      <span className="font-semibold text-voice-accent">“{c.phrase}”</span>
                      <span className="ml-2 text-xs text-voice-text-dim">{c.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="voice-surface flex items-center gap-3 p-3">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Start voice command"}
            onClick={() => setListening((v) => !v)}
            className={cn(
              "relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 bg-voice-accent/10 text-voice-accent transition-colors sm:h-24 sm:w-24",
              listening
                ? "voice-mic-active border-voice-accent/70"
                : "voice-mic-idle border-voice-accent/40 hover:bg-voice-accent/16",
            )}
          >
            {listening ? (
              <span
                aria-hidden
                className="voice-ripple absolute inset-0 rounded-full border border-voice-accent/40"
              />
            ) : null}
            {listening ? <Mic className="h-9 w-9" /> : <MicOff className="h-8 w-8" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Radio
                className={cn("h-4 w-4", listening ? "text-voice-accent" : "text-voice-text-dim")}
              />
              <span className="font-display text-sm uppercase tracking-[0.16em] text-voice-text">
                {listening ? "Listening…" : "Voice ready — tap or say “Hercules”"}
              </span>
            </div>
            <p className="mt-1 truncate text-base text-voice-text-dim">
              {listening ? (
                <span className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                    <span
                      key={i}
                      className="w-1 animate-pulse rounded-full bg-voice-accent/70"
                      style={{
                        height: `${6 + ((i * 7) % 20)}px`,
                        animationDelay: `${i * 70}ms`,
                      }}
                    />
                  ))}
                </span>
              ) : (
                lines[lines.length - 1]?.text
              )}
            </p>
          </div>

          {/* One-tap brightness override, always within reach. */}
          <BrightnessButton />

          <Button
            variant="outline"
            size="lg"
            className="hidden shrink-0 gap-2 border-voice-line bg-transparent text-voice-text hover:bg-voice-accent/12 hover:text-voice-text sm:inline-flex"
            onClick={() => setOpen((v) => !v)}
          >
            <Volume2 className="h-4 w-4" />
            Transcript
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-voice-line bg-transparent text-voice-text sm:hidden"
            aria-label="Toggle transcript"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
