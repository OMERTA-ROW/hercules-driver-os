import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { useVoice } from "@/lib/voice";
import { cn } from "@/lib/utils";

/**
 * CONVERSATION VIEW — a real back-and-forth, not a command log.
 * Driver turns sit right, HERCULES turns left. Anything that would book,
 * commit, or spend arrives as a proposal that waits for an explicit yes.
 */
export function Conversation({ className }: { className?: string | undefined }) {
  const { turns, mode, voice, approve, decline } = useVoice();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, mode]);

  return (
    <div className={cn("space-y-3", className)}>
      {turns.length === 0 ? (
        <p className="tech-label text-center">
          Nothing said yet — start talking and it lands here
        </p>
      ) : null}

      {turns.map((t) => (
        <div
          key={t.id}
          className={cn("turn-in flex", t.from === "driver" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[46ch] rounded-2xl px-4 py-3 text-[0.98rem] font-light leading-relaxed",
              t.from === "driver"
                ? "bg-voice-accent-soft/12 text-voice-text-dim hairline"
                : "bg-voice-accent/8 text-voice-text",
              t.from === "hercules" && "border border-voice-accent/25",
            )}
          >
            <span className="tech-label mb-1 block text-voice-accent">
              {t.from === "driver" ? "You" : voice.name}
            </span>
            {t.text}

            {t.proposal ? (
              <div className="mt-3 rounded-xl border border-primary/40 bg-primary/8 p-3">
                <span className="tech-label block text-primary">Waiting on your word</span>
                <p className="mt-1 text-sm text-voice-text">{t.proposal.summary}</p>
                {t.proposal.total ? (
                  <p className="metric mt-1 text-lg font-bold text-primary">{t.proposal.total}</p>
                ) : null}
                {t.status ? (
                  <p
                    className={cn(
                      "tech-label mt-2",
                      t.status === "approved" ? "text-go" : "text-muted-foreground",
                    )}
                  >
                    {t.status === "approved" ? "Approved by you" : "Declined — nothing charged"}
                  </p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => approve(t.id)}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary/90 px-4 font-display text-xs uppercase tracking-[0.18em] text-primary-foreground"
                    >
                      <Check className="h-4 w-4" /> Yes, do it
                    </button>
                    <button
                      type="button"
                      onClick={() => decline(t.id)}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-full hairline px-4 font-display text-xs uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      <X className="h-4 w-4" /> No
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {mode === "listening" ? (
        <div className="turn-in flex justify-end">
          <span className="tech-label rounded-full border border-voice-accent/30 px-4 py-2 text-voice-accent">
            Listening…
          </span>
        </div>
      ) : null}
      {mode === "speaking" ? (
        <div className="turn-in flex justify-start">
          <span className="tech-label rounded-full border border-voice-accent/30 px-4 py-2 text-voice-accent">
            {voice.name} speaking…
          </span>
        </div>
      ) : null}
      <div ref={end} />
    </div>
  );
}
