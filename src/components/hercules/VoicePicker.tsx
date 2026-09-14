import { Check, Crown, Loader2, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice, femaleVoices, maleVoices, type VoiceOption } from "@/lib/voice";
import { VoiceServiceStatus } from "@/components/hercules/VoiceServiceStatus";

/**
 * THE VOICE PICKER
 * ================
 * Named personas out of the ZEUS / HERCULES mythology, each with its own
 * character descriptor and a preview so the driver hears the voice before
 * choosing it. Compact and scrollable — cab-sized rows, no full-page takeover.
 */
function VoiceRow({ v }: { v: VoiceOption }) {
  const { voice, setVoice, preview, previewing, stop, speechSource, speechNote } = useVoice();
  const active = voice.id === v.id;
  const playing = previewing === v.id;

  return (
    <div
      className={cn(
        "flex min-h-[76px] items-center gap-3 rounded-xl border p-3 transition-colors",
        active
          ? "border-primary/60 bg-primary/10 shadow-[0_0_22px_-14px_var(--primary)]"
          : "border-border bg-card/50",
      )}
    >
      <button
        type="button"
        onClick={() => (playing ? stop() : void preview(v.id))}
        aria-label={playing ? `Stop ${v.name} preview` : `Hear ${v.name}`}
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-full border transition-colors",
          playing
            ? "border-primary bg-primary/20 text-primary"
            : "border-primary/40 text-primary hover:bg-primary/10",
        )}
      >
        {playing ? (
          <Square className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current" />
        )}
      </button>

      <button
        type="button"
        onClick={() => setVoice(v.id)}
        aria-pressed={active}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-light uppercase tracking-[0.18em]">
            {v.name}
          </span>
          {v.principal ? (
            <span className="tech-label inline-flex items-center gap-1 text-primary">
              <Crown className="h-3 w-3" /> Principal
            </span>
          ) : null}
          {active ? (
            <span className="tech-label ml-auto inline-flex items-center gap-1 text-primary">
              <Check className="h-3.5 w-3.5" /> Selected
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{v.hint}</span>
        {playing && speechSource === "device" ? (
          <span className="mt-1 block text-xs leading-relaxed text-warn">
            You're hearing your device's own voice, not {v.name}. {speechNote}
          </span>
        ) : null}
        {playing && speechSource === "unavailable" ? (
          <span className="mt-1 block text-xs leading-relaxed text-warn">
            Nothing could be played on this device. The line is on screen instead.
          </span>
        ) : null}
      </button>
    </div>
  );
}

export function VoicePicker() {
  const { voice, previewing, speechSource } = useVoice();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tech-label">Speaking as</span>
        <span className="font-display text-lg font-light uppercase tracking-[0.2em] text-primary">
          {voice.name}
        </span>
        {previewing ? (
          <span className="tech-label inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Previewing
          </span>
        ) : null}
      </div>

      <div className="mt-3 max-h-[min(58vh,520px)] space-y-4 overflow-y-auto overscroll-contain pr-1">
        <div>
          <div className="tech-label mb-2">Male voices</div>
          <div className="space-y-2">
            {maleVoices.map((v) => (
              <VoiceRow key={v.id} v={v} />
            ))}
          </div>
        </div>
        <div>
          <div className="tech-label mb-2">Female voices</div>
          <div className="space-y-2">
            {femaleVoices.map((v) => (
              <VoiceRow key={v.id} v={v} />
            ))}
          </div>
        </div>
      </div>

      <VoiceServiceStatus />

      <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="text-foreground">About the previews:</span> each Play button plays a
          short recorded clip that ships with the app — free, no credits used, the same clip for
          everyone. Those clips were recorded with an earlier voice service, so they give you the
          character and pace but are not the exact voice you'll hear on the road. Speaking your own
          lines aloud during a drive is the part that costs AI credits; without credits, or when the
          voice service can't be reached, your device's own built-in voice reads them instead and
          you'll see that said plainly on the row.
        </p>

        <p>
          What the voice understands today is a fixed set of spoken commands — loads, money, the
          map, hours, breakdowns, documents — not open-ended conversation. Whichever character you
          pick still asks before it books, spends or commits anything, and your choice stays on your
          profile.
        </p>
        {speechSource === "premium" ? (
          <p className="text-primary">That was the live AI voice, spoken just for you.</p>
        ) : null}
        {speechSource === "sample" ? (
          <p className="text-muted-foreground">
            That was the recorded preview clip, not the live voice service.
          </p>
        ) : null}
      </div>
    </>
  );
}
