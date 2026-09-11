import { useEffect, useRef } from "react";
import { useParts } from "@/lib/parts";
import { usePickup } from "@/lib/pickup";
import { useVoice } from "@/lib/voice";

/**
 * Wires part pickup routing to the order book and the voice layer.
 *
 * 1. Any order placed for collection — tapped or spoken — gets a truck-legal
 *    route built and OFFERED automatically. The driver never looks the supplier
 *    up by hand.
 * 2. Everything the pickup tracker wants said gets spoken by HERCULES,
 *    unprompted: the offer, the held-then-ready prompt, the pickup window
 *    closing in, and routing past the counter with the part still on the shelf.
 *
 * DRIVER APPROVED: this bridge only builds offers and talks. Dispatching the
 * route is `approve()`, and only the driver calls that.
 */
export function PickupBridge() {
  const { orders } = useParts();
  const { offer, takeAnnouncement, runs, approve, decline, minutesOut } = usePickup();
  const { announce, mode, turns, pending } = useVoice();

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const runsRef = useRef(runs);
  runsRef.current = runs;
  const handled = useRef<string | null>(null);

  /* Build the pickup offer the moment a collection order lands. */
  useEffect(() => {
    for (const o of orders) offer(o);
  }, [orders, offer]);

  /* Speak the queue one line at a time, never over the top of itself. */
  useEffect(() => {
    const t = setInterval(() => {
      if (modeRef.current === "speaking" || modeRef.current === "listening") return;
      const next = takeAnnouncement();
      if (next) announce(next.text);
    }, 900);
    return () => clearInterval(t);
  }, [announce, takeAnnouncement]);

  /**
   * The driver's own words dispatch the route, ask where the part is, or wave it
   * off. Only handled when no other proposal is waiting on an answer, so a yes
   * never lands on the wrong thing.
   */
  useEffect(() => {
    const last = turns[turns.length - 1];
    if (!last || last.from !== "driver") return;
    if (handled.current === last.id) return;
    handled.current = last.id;
    if (pending) return;

    const t = last.text.toLowerCase();
    const offered = runsRef.current.find((r) => r.status === "offered");
    const routed = runsRef.current.find((r) => r.status === "routed");
    const held = runsRef.current.find((r) => r.status === "held");

    const asking =
      /(where.{0,12}(part|pickup|counter))|(pick ?up|will.?call|counter).{0,20}(where|when|how far|status)|my part/.test(
        t,
      );
    const wantsRoute =
      /(send it|put it on (the|my) map|route me|take me there|navigate|dispatch (it|the route)|let'?s go get it|go get it)/.test(
        t,
      ) || /^(yes|yeah|yep|do it|go ahead|affirmative)\b/.test(t.trim());
    const waveOff = /(not now|skip it|keep rolling|forget it|leave it)/.test(t);

    if (offered && wantsRoute) {
      void approve(offered.id);
      return;
    }
    if (offered && waveOff) {
      decline(offered.id);
      announce(
        `Understood — I'm not touching your navigation. Your ${offered.label} stays on their will-call shelf and I'll remind you if you route past it.`,
      );
      return;
    }
    if (asking) {
      const r = routed ?? offered ?? held;
      if (!r) {
        announce("Nothing waiting on a counter for you right now.");
        return;
      }
      if (r.status === "routed") {
        announce(
          `Your ${r.label} is at ${r.vendor}, about ${Math.max(0, minutesOut(r))} minutes out on the route I've got you on. ${r.site.counter}. ${r.site.parking}.`,
        );
      } else if (r.status === "held") {
        announce(
          `Your ${r.label} isn't ready at ${r.vendor} yet — ${r.ready}. Route is built and held. I'll bring it up the second the counter has it.`,
        );
      } else {
        announce(
          `Your ${r.label} is ready at ${r.vendor}, ${r.site.milesAhead} miles ahead, ${r.driveMin} minutes with the detour. Say the word and I'll put the route on your map.`,
        );
      }
    }
  }, [turns, pending, approve, decline, announce, minutesOut]);

  return null;
}
