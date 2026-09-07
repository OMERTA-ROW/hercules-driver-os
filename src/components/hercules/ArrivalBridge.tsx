import { useEffect, useRef } from "react";
import { minutesFromSpeech } from "@/data/arrivals";
import { useArrivals } from "@/lib/arrivals";
import { useVoice } from "@/lib/voice";

/**
 * Wires the arrival tracker to the voice layer.
 *
 * 1. Anything the tracker wants said gets spoken by HERCULES, unprompted.
 * 2. Anything the driver says that contains a quoted window ("he said about an
 *    hour") starts the mechanic timer automatically — the driver never has to
 *    start a stopwatch.
 */
export function ArrivalBridge() {
  const { takeAnnouncement, inbound, setQuote } = useArrivals();
  const { announce, mode, turns } = useVoice();

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const inboundRef = useRef(inbound);
  inboundRef.current = inbound;
  const handled = useRef<string | null>(null);

  /* Speak the queue, one line at a time, never over the top of itself. */
  useEffect(() => {
    const t = setInterval(() => {
      if (modeRef.current === "speaking" || modeRef.current === "listening") return;
      const next = takeAnnouncement();
      if (next) announce(next.text);
    }, 800);
    return () => clearInterval(t);
  }, [announce, takeAnnouncement]);

  /* Pick the quoted window out of the driver's own words. */
  useEffect(() => {
    const last = turns[turns.length - 1];
    if (!last || last.from !== "driver") return;
    if (handled.current === last.id) return;
    handled.current = last.id;

    const mech = inboundRef.current.find((a) => a.kind === "mechanic");
    if (!mech) return;
    if (!/(said|says|told|quoted|about|be here|be out|out here|eta)/i.test(last.text)) return;

    const mins = minutesFromSpeech(last.text);
    if (!mins) return;
    setQuote(mech.id, mins);
    announce(
      `Got it — ${mins} minutes from now for ${mech.who} at ${mech.org}. My timer is running. I'll check in with you five minutes before that window is up, and I'll flag it if he's late.`,
    );
  }, [turns, setQuote, announce]);

  return null;
}
