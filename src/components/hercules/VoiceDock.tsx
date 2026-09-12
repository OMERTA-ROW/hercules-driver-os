import { cn } from "@/lib/utils";
import { Orb } from "./Orb";
import { BrightnessButton } from "./ThemeToggle";
import { useVoice } from "@/lib/voice";

/**
 * VOICE DOCK — the orb, shrunk, following the driver through every screen.
 * No transcript panel: the orb and one spoken line of state, nothing more.
 */
export function VoiceDock() {
  const { mode, colorway, listen, stop, voice, lastLine } = useVoice();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto w-full max-w-[1800px] px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="glass flex items-center gap-4 p-3">
          <Orb
            className="w-16 shrink-0 sm:w-20"
            mode={mode}
            colorway={colorway}
            onActivate={mode === "idle" ? listen : stop}
          />

          <div className="min-w-0 flex-1">
            <span className="tech-label text-voice-accent">
              {mode === "listening"
                ? "Listening"
                : mode === "speaking"
                  ? `${voice.name} speaking`
                  : "Voice ready — tap the orb or say “Hercules”"}
            </span>
            <p
              className={cn(
                "mt-1 truncate text-[0.95rem] font-light",
                mode === "listening" ? "text-voice-accent/70" : "text-voice-text-dim",
              )}
            >
              {mode === "listening" ? "Go ahead, I'm on it." : lastLine || "Ask me anything."}
            </p>
          </div>

          <BrightnessButton />
        </div>
      </div>
    </div>
  );
}
