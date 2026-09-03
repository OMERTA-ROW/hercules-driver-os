import { useEffect, useState } from "react";
import { Mic, MicOff, Volume2, ChevronUp, ChevronDown, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transcript as seedTranscript, voiceCommands } from "@/data/mock";
import { Label } from "./primitives";

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

export function VoiceDock() {
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(seedTranscript);
  const [replyIdx, setReplyIdx] = useState(0);

  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => {
      setLines((prev) => [
        ...prev,
        { from: "driver", text: "Hercules, how am I doing?" },
        cannedReplies[replyIdx % cannedReplies.length],
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
          <div className="panel mb-2 max-h-[46vh] overflow-y-auto p-4">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <Label className="mb-2">Transcript</Label>
                <div className="space-y-2">
                  {lines.slice(-8).map((l, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm leading-relaxed",
                        l.from === "driver"
                          ? "border-border bg-secondary text-secondary-foreground"
                          : "border-primary/35 bg-primary/8 text-foreground",
                      )}
                    >
                      <span className="label-cap mr-2">
                        {l.from === "driver" ? "You" : "Hercules"}
                      </span>
                      {l.text}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2">Try saying</Label>
                <ul className="space-y-1.5">
                  {voiceCommands.slice(0, 6).map((c) => (
                    <li
                      key={c.phrase}
                      className="rounded-md border border-border/70 bg-card/60 px-3 py-1.5 text-sm"
                    >
                      <span className="font-semibold text-primary">“{c.phrase}”</span>
                      <span className="ml-2 text-xs text-muted-foreground">{c.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="panel flex items-center gap-3 p-3">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Start voice command"}
            onClick={() => setListening((v) => !v)}
            className={cn(
              "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 transition-all sm:h-20 sm:w-20",
              listening
                ? "glow-ring animate-pulse border-primary bg-primary text-primary-foreground"
                : "border-primary/60 bg-secondary text-primary hover:bg-primary/15",
            )}
          >
            {listening ? <Mic className="h-8 w-8" /> : <MicOff className="h-7 w-7" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Radio
                className={cn("h-4 w-4", listening ? "text-primary" : "text-muted-foreground")}
              />
              <span className="font-display text-sm uppercase tracking-[0.16em]">
                {listening ? "Listening…" : "Voice ready — tap or say “Hercules”"}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {listening ? (
                <span className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                    <span
                      key={i}
                      className="w-1 animate-pulse rounded-full bg-primary"
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

          <Button
            variant="outline"
            size="lg"
            className="hidden shrink-0 gap-2 sm:inline-flex"
            onClick={() => setOpen((v) => !v)}
          >
            <Volume2 className="h-4 w-4" />
            Transcript
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 sm:hidden"
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
