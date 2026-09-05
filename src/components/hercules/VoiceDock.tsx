import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Orb } from "./Orb";
import { Conversation } from "./Conversation";
import { BrightnessButton } from "./ThemeToggle";
import { useVoice } from "@/lib/voice";

/**
 * VOICE DOCK — the orb, shrunk, following the driver through every screen.
 * Glass over near-black, warm amber-gray type, no bright surfaces.
 */
export function VoiceDock() {
  const [open, setOpen] = useState(false);
  const { mode, colorway, listen, stop, voice, lastLine } = useVoice();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto w-full max-w-[1800px] px-3 pb-3 sm:px-4 sm:pb-4">
        {open ? (
          <div className="glass mb-2 max-h-[46vh] overflow-y-auto p-4">
            <Conversation />
          </div>
        ) : null}

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

          <button
            type="button"
            aria-label="Toggle conversation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-14 shrink-0 items-center gap-2 rounded-full hairline px-4 text-voice-text"
          >
            <span className="tech-label hidden sm:inline">Conversation</span>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
