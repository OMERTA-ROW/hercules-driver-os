import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { currentLoad, hos, loads, alerts, faultCodes, loadPnL } from "@/data/mock";
import { hazards } from "@/data/hazards";
import { truckStops, BOOKING_FEE } from "@/data/stops";

/**
 * HERCULES VOICE LAYER
 * -------------------------------------------------------------------------
 * A continuous conversation, not a command menu. Every driver utterance is
 * matched against the live data model, the reply keeps the topic so follow-ups
 * ("how much?", "book it", "what about the next one") resolve in context.
 *
 * DRIVER APPROVED: any reply that would book, commit, or spend money attaches a
 * `pending` proposal. Nothing happens until the driver explicitly approves it —
 * by voice ("yes, book it") or by the confirm control. Declining is always
 * one word away.
 *
 * A real speech stack (STT + TTS) plugs in behind `startListening` /
 * `speakingFor`; the selected VoiceOption maps to a TTS voice id.
 */

/* ------------------------------------------------------------------ ORB LOOK */

export type OrbColorway = "black" | "grey" | "white";

export const orbColorways: { id: OrbColorway; label: string; hint: string }[] = [
  { id: "black", label: "Black", hint: "Obsidian shell, gold filament — default" },
  { id: "grey", label: "Grey", hint: "Gunmetal shell, gold filament" },
  { id: "white", label: "White", hint: "Bone shell, gold filament — brightest in sun" },
];

/* ---------------------------------------------------------------- VOICE CAST */

export type VoiceId = "hercules" | "atlas" | "orion" | "athena" | "nova" | "juno";

export type VoiceOption = {
  id: VoiceId;
  name: string;
  gender: "male" | "female";
  hint: string;
  principal?: boolean;
};

export const voiceOptions: VoiceOption[] = [
  {
    id: "hercules",
    name: "Hercules",
    gender: "male",
    hint: "Deep and steady — cuts under engine noise",
    principal: true,
  },
  { id: "atlas", name: "Atlas", gender: "male", hint: "Slower cadence, flat and calm" },
  { id: "orion", name: "Orion", gender: "male", hint: "Clipped, dispatcher-quick" },
  { id: "athena", name: "Athena", gender: "female", hint: "Even and clear at highway speed" },
  { id: "nova", name: "Nova", gender: "female", hint: "Bright, quick, high intelligibility" },
  { id: "juno", name: "Juno", gender: "female", hint: "Low and unhurried, built for night runs" },
];

export function voiceById(id: VoiceId) {
  return voiceOptions.find((v) => v.id === id) ?? voiceOptions[0]!;
}

/* ------------------------------------------------------------------ CONVERSATION */

export type Speaker = "driver" | "hercules";

export type Proposal = {
  /** Plain-language summary read aloud before anything commits. */
  summary: string;
  /** Money the driver would spend, already totalled with any fee. */
  total?: string;
};

export type Turn = {
  id: string;
  from: Speaker;
  text: string;
  /** Attached to a HERCULES turn that needs an explicit yes. */
  proposal?: Proposal;
  status?: "approved" | "declined";
};

export type VoiceMode = "idle" | "listening" | "speaking";

type Topic =
  | "breakdown"
  | "clock"
  | "loads"
  | "money"
  | "route"
  | "hazards"
  | "stops"
  | "health"
  | "alerts"
  | "none";

function hm(min: number) {
  return `${Math.floor(min / 60)} hours ${min % 60} minutes`;
}

type Reply = { text: string; topic: Topic; proposal?: Proposal };

/** Follow-ups the driver can say once a topic is on the table. */
function followUp(topic: Topic, text: string): Reply | null {
  const t = text.toLowerCase();
  const wantsMore = /(more|detail|go on|keep going|what else|and\?|tell me more)/.test(t);
  const wantsNext = /(next one|the other|another|second)/.test(t);

  if (topic === "loads" && (wantsMore || wantsNext)) {
    const l = loads[wantsNext ? 1 : 0]!;
    return {
      topic: "loads",
      text: `${l.origin} to ${l.destination}, ${l.miles} miles at $${l.rpm.toFixed(2)} a mile, $${l.rate.toLocaleString()} total. Pickup window ${l.pickupWindow}. ${l.shipper.name} — ${l.shipper.hours24 ? "24-hour facility" : `open ${l.shipper.open} to ${l.shipper.close}`}, ${l.shipper.overnightAllowed ? "overnight parking allowed on site" : `nearest safe parking ${l.shipper.nearestSafeParkingMiles} miles out`}. Say "book it" and I'll read the whole thing back before anything is committed.`,
    };
  }
  if (topic === "loads" && /(book|take|grab) ?(it|that)?/.test(t)) {
    const l = loads[0]!;
    return {
      topic: "loads",
      text: `Here's exactly what I'd commit to: ${l.origin} to ${l.destination}, ${l.miles} miles, $${l.rate.toLocaleString()} at $${l.rpm.toFixed(2)} a mile, pickup ${l.pickupWindow}. I have not booked it. Say yes to approve, or no and I'll drop it.`,
      proposal: {
        summary: `Book load ${l.id}: ${l.origin} → ${l.destination}, $${l.rate.toLocaleString()}`,
        total: `$${l.rate.toLocaleString()} revenue`,
      },
    };
  }
  if (topic === "stops" && /(book|reserve|take) ?(it|that|the shower|parking)?/.test(t)) {
    const s = truckStops[0]!;
    return {
      topic: "stops",
      text: `Shower at ${s.name} is ${s.showerPrice} dollars, plus the ${BOOKING_FEE} dollar HERCULES booking fee — ${s.showerPrice + BOOKING_FEE} dollars total. Nothing is charged yet. Say yes to approve it.`,
      proposal: {
        summary: `Shower at ${s.name} — $${s.showerPrice.toFixed(2)} + $${BOOKING_FEE.toFixed(2)} HERCULES booking fee`,
        total: `$${(s.showerPrice + BOOKING_FEE).toFixed(2)}`,
      },
    };
  }
  if (topic === "clock" && wantsMore) {
    return {
      topic: "clock",
      text: `On duty ${hm(hos.onDutyRemainingMin)} remaining, and your 30-minute break is due in ${hm(hos.breakInMin)}. Your own pattern says you start fading before the clock does — I'd plan the break early. Your call.`,
    };
  }
  return null;
}

/** The conversation brain — keyword intent over the live data model. */
export function respond(text: string, topic: Topic): Reply {
  const t = text.toLowerCase().trim();

  const fu = followUp(topic, t);
  if (fu) return fu;

  if (/(clock|hours|hos|drive time|break|log)/.test(t)) {
    return {
      topic: "clock",
      text: `You have ${hm(hos.driveRemainingMin)} of drive time left and ${hm(hos.breakInMin)} until your break is due. ${currentLoad.milesRemaining} miles to ${currentLoad.destination}, ETA ${currentLoad.etaLocal} — that leaves you slack in the window.`,
    };
  }
  if (/(load|freight|board|rate|haul|book)/.test(t)) {
    const l = loads[0]!;
    return {
      topic: "loads",
      text: `Best on the board is ${l.origin} to ${l.destination} — ${l.miles} miles at $${l.rpm.toFixed(2)} a mile. ${l.shipper.name} is ${l.shipper.hours24 ? "a 24-hour facility" : "on set hours"}, ${l.shipper.appointment.toLowerCase()}. Want the details, or should I read back a booking for your approval?`,
    };
  }
  if (/(money|profit|margin|per mile|settlement|pay|fuel cost|revenue)/.test(t)) {
    const p = loadPnL[0]!;
    return {
      topic: "money",
      text: `Current run is netting $${p.profit.toLocaleString()} — that's $${(p.profit / p.miles).toFixed(2)} a mile after fuel, tolls, and fixed cost. Above your 30-day average. Ask me for the breakdown and I'll read the line items.`,
    };
  }
  if (/(turn|route|navigat|reroute|eta|miles|where am i)/.test(t)) {
    return {
      topic: "route",
      text: `${currentLoad.milesRemaining} miles to ${currentLoad.destination}, ETA ${currentLoad.etaLocal}. The whole route is truck-legal for your height, weight, and length. If a scale or a backup shows up I'll offer a legal way around it — I won't change your route on my own.`,
    };
  }
  if (/(hazard|bridge|clearance|grade|switchback|ramp|scale|crossing|steep)/.test(t)) {
    const h = hazards[0]!;
    return {
      topic: "hazards",
      text: `Nearest thing worth knowing: ${h.name}. ${h.detail}. I'll call it out well before you get there, sized so you don't have to look down.`,
    };
  }
  if (/(shower|park|stop|diesel|fuel|sleep|rest|eat|food)/.test(t)) {
    const s = truckStops[0]!;
    return {
      topic: "stops",
      text: `${s.name} is ${s.milesAhead} miles ahead — diesel $${s.dieselPrice.toFixed(3)}, ${s.parkingOpen} of ${s.parkingTotal} truck spaces open, ${s.showersOpen} showers free. Say "book it" and I'll read the total plus the ${BOOKING_FEE} dollar booking fee before anything is charged.`,
    };
  }
  if (/(fault|engine|health|tire|maintenance|def|coolant|brake)/.test(t)) {
    const f = faultCodes[0]!;
    return {
      topic: "health",
      text: `You have ${faultCodes.length} active codes. Top one is ${f.code} on the ${f.system.toLowerCase()} — ${f.text} Nothing shuts you down right now.`,
    };
  }
  if (/(dot|inspection|alert|cop|bear|weigh|closed)/.test(t)) {
    const a = alerts[0]!;
    return {
      topic: "alerts",
      text: `${a.kind} ${a.milesAhead} miles ahead at ${a.location}. ${a.note} ${a.confirmations} drivers confirmed it. Plenty of time to be squared away before you get there.`,
    };
  }
  if (/(hello|hey|hi|you there|hercules)$/.test(t) || t.length < 4) {
    return {
      topic: "none",
      text: "I'm here. Ask me anything about the truck, the clock, the money, or the road ahead.",
    };
  }
  return {
    topic: "none",
    text: `I heard you. I can talk you through the clock, the load board, the money on this run, the road ahead, hazards, or a place to stop. What do you want to know?`,
  };
}

/** What the driver says when they just tap the orb and start talking. */
const driverPrompts = [
  "Hercules, how am I doing?",
  "What's my clock look like?",
  "Anything good on the board?",
  "What am I making on this run?",
  "What's ahead of me on this road?",
  "Where can I shower and park tonight?",
];

/* ------------------------------------------------------------------ PROVIDER */

type Ctx = {
  mode: VoiceMode;
  turns: Turn[];
  colorway: OrbColorway;
  setColorway: (c: OrbColorway) => void;
  voice: VoiceOption;
  setVoice: (id: VoiceId) => void;
  /** Tap or wake word — starts a listening turn. */
  listen: () => void;
  /** Stop everything mid-sentence. */
  stop: () => void;
  /** Send a driver utterance into the conversation. */
  say: (text: string) => void;
  approve: (turnId: string) => void;
  decline: (turnId: string) => void;
  clear: () => void;
  /** The line currently being spoken or the last thing said. */
  lastLine: string;
  pending: Turn | undefined;
};

const VoiceContext = createContext<Ctx | null>(null);

const COLOR_KEY = "hercules.orb-colorway";
const VOICE_KEY = "hercules.voice";

let seq = 0;
const nextId = () => `t${++seq}-${Date.now()}`;

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [topic, setTopic] = useState<Topic>("none");
  const [colorway, setColorwayState] = useState<OrbColorway>("black");
  const [voiceId, setVoiceIdState] = useState<VoiceId>("hercules");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const promptIdx = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const c = localStorage.getItem(COLOR_KEY) as OrbColorway | null;
    if (c === "black" || c === "grey" || c === "white") setColorwayState(c);
    const v = localStorage.getItem(VOICE_KEY) as VoiceId | null;
    if (v && voiceOptions.some((o) => o.id === v)) setVoiceIdState(v);
  }, []);

  const setColorway = useCallback((c: OrbColorway) => {
    setColorwayState(c);
    localStorage.setItem(COLOR_KEY, c);
  }, []);

  const setVoice = useCallback((id: VoiceId) => {
    setVoiceIdState(id);
    localStorage.setItem(VOICE_KEY, id);
  }, []);

  const push = useCallback((turn: Turn) => setTurns((prev) => [...prev, turn]), []);

  /* Latest turns, readable inside callbacks without re-creating them. */
  const turnsRef = useRef<Turn[]>(turns);
  turnsRef.current = turns;

  /* Spoken confirmation must be explicit — a clear yes or no, nothing inferred. */
  const YES = /^(yes|yeah|yep|yes[, ]+(do it|book it|approve.*)|do it|book it|approve it|go ahead|confirm it?)\b/i;
  const NO = /^(no|nope|no[, ]+(thanks|don'?t|drop it)|don'?t|cancel( that)?|drop it|skip it|forget it)\b/i;

  /** Driver line in → HERCULES thinks → HERCULES speaks. */
  const say = useCallback(
    (text: string) => {
      clearTimers();
      push({ id: nextId(), from: "driver", text });
      setMode("speaking");

      // DRIVER APPROVED: an open proposal is only settled by an explicit
      // spoken yes or no. Anything else is treated as a normal question and
      // the proposal stays pending, uncommitted.
      const open = [...turnsRef.current].reverse().find((t) => t.proposal && !t.status);
      const t = text.trim();
      if (open && (YES.test(t) || NO.test(t))) {
        const approved = YES.test(t);
        setTurns((prev) =>
          prev.map((x) =>
            x.id === open.id ? { ...x, status: approved ? "approved" : "declined" } : x,
          ),
        );
        const line = approved
          ? `Approved by you. ${open.proposal!.summary} is confirmed. I logged it under your name.`
          : "Dropped it. Nothing was booked and nothing was charged.";
        timers.current.push(
          setTimeout(() => {
            push({ id: nextId(), from: "hercules", text: line });
            timers.current.push(setTimeout(() => setMode("idle"), 2600));
          }, 600),
        );
        return;
      }

      const reply = respond(text, topic);
      setTopic(reply.topic);
      timers.current.push(
        setTimeout(() => {
          push({
            id: nextId(),
            from: "hercules",
            text: reply.text,
            ...(reply.proposal ? { proposal: reply.proposal } : {}),
          });
          // Speaking time roughly tracks the length of the line.
          const readMs = Math.min(9000, 1800 + reply.text.length * 28);
          timers.current.push(setTimeout(() => setMode("idle"), readMs));
        }, 650),
      );
    },
    [clearTimers, push, topic],
  );

  const listen = useCallback(() => {
    clearTimers();
    setMode("listening");
    // A real STT stream replaces this: the driver's words arrive, then `say`.
    timers.current.push(
      setTimeout(() => {
        const prompt = driverPrompts[promptIdx.current % driverPrompts.length]!;
        promptIdx.current += 1;
        say(prompt);
      }, 2200),
    );
  }, [clearTimers, say]);

  const stop = useCallback(() => {
    clearTimers();
    setMode("idle");
  }, [clearTimers]);

  const settle = useCallback(
    (turnId: string, status: "approved" | "declined", line: string) => {
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, status } : t)));
      clearTimers();
      setMode("speaking");
      push({ id: nextId(), from: "hercules", text: line });
      timers.current.push(setTimeout(() => setMode("idle"), 3200));
    },
    [clearTimers, push],
  );

  const approve = useCallback(
    (turnId: string) =>
      settle(
        turnId,
        "approved",
        "Approved on your word. It's done and logged, and I've put a copy in your documents.",
      ),
    [settle],
  );

  const decline = useCallback(
    (turnId: string) => settle(turnId, "declined", "Dropped it. Nothing was booked and nothing was charged."),
    [settle],
  );

  const clear = useCallback(() => {
    clearTimers();
    setTurns([]);
    setTopic("none");
    setMode("idle");
  }, [clearTimers]);

  const lastLine = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.from === "hercules");
    return last?.text ?? "";
  }, [turns]);

  const pending = useMemo(
    () => [...turns].reverse().find((t) => t.proposal && !t.status),
    [turns],
  );

  const value: Ctx = {
    mode,
    turns,
    colorway,
    setColorway,
    voice: voiceById(voiceId),
    setVoice,
    listen,
    stop,
    say,
    approve,
    decline,
    clear,
    lastLine,
    pending,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside VoiceProvider");
  return ctx;
}
