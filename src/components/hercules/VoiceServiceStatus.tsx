import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlugZap, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { voiceProviderStatus } from "@/lib/speech.functions";

type Status = Awaited<ReturnType<typeof voiceProviderStatus>>;

/**
 * VOICE SERVICE STATUS — the truth about what is actually speaking.
 *
 * Signed in, this asks the server whether the real voice service is connected
 * and whether every character has a voice available on this account. It never
 * claims a live connection it has not confirmed, and it never touches the key:
 * the key stays on the server.
 */
export function VoiceServiceStatus() {
  const { userId } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(() => {
    setLoading(true);
    return voiceProviderStatus()
      .then((s) => setStatus(s))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId) {
      setStatus(null);
      return;
    }
    void check();
  }, [userId, check]);

  if (!userId) return null;

  const connected = status?.connected === true;
  const checkedAt = status?.checkedAt ? new Date(status.checkedAt) : null;

  return (
    <div className="bubble-card mt-3 border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tech-label inline-flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : connected ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          ) : (
            <PlugZap className="h-3.5 w-3.5 text-warn" />
          )}
          Real AI voice service
        </span>
        <span className={connected ? "text-xs text-primary" : "text-xs text-warn"}>
          {loading
            ? "Checking…"
            : connected
              ? "Connected"
              : "Not connected — your device is speaking"}
        </span>
        <button
          type="button"
          onClick={() => void check()}
          disabled={loading}
          className="matte-control glow-control ml-auto inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} /> Check again
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {loading
          ? "Asking the server what is connected."
          : (status?.message ??
            "The real AI voice service isn't connected yet, so every line is spoken by your device, free.")}
      </p>

      {status && status.voices.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {status.voices.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2">
              <span className="text-foreground">{v.persona}</span>
              <span className={v.available ? "text-muted-foreground" : "text-warn"}>
                {v.available ? v.name : "no voice available"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {checkedAt && !loading ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Last checked {checkedAt.toLocaleTimeString()}.
        </p>
      ) : null}
    </div>
  );
}
