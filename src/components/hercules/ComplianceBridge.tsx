import { useEffect, useRef } from "react";
import { useCompliance } from "@/lib/compliance";
import { useVoice } from "@/lib/voice";

/**
 * Speaks document expiries out loud, unprompted — one line at a time, never
 * over the top of a live conversation. Bulk-imported records sit in the same
 * list as camera uploads, so they are warned about identically.
 */
export function ComplianceBridge() {
  const { takeWarning, ready } = useCompliance();
  const { announce, mode } = useVoice();

  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      if (modeRef.current === "speaking" || modeRef.current === "listening") return;
      const line = takeWarning();
      if (line) announce(line);
    }, 4000);
    return () => clearInterval(t);
  }, [ready, takeWarning, announce]);

  return null;
}
