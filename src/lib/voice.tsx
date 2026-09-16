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
import type { AlertRow, Hours, LoadRow } from "@/lib/live";
import { hazards } from "@/data/hazards";
import { rulesFor, specFor, type VehicleSpec } from "@/data/vehicles";
import { activeAdapter, activeFaults, activePredictions } from "@/lib/bolt";
import { truckStops, BOOKING_FEE } from "@/data/stops";
import {
  currentLocation as dropLocation,
  favorites as supplyFavorites,
  nearestCovered,
  orderOptions,
  serviceOf,
  services as supplyServices,
  spokenCoverage,
  coverageFor as coverageAt,
} from "@/data/delivery";
import { currentFix, problems, services } from "@/data/breakdown";
import {
  bestListing,
  categoryById,
  categoryFromSpeech,
  itemsIn,
  matchParts,
  partForFault,
  spokenListing,
  supplierById,
  type Listing,
  type SupplyCategoryId,
} from "@/data/parts";
import { serviceFeeFor, spokenFee, totalWithFee } from "@/data/fees";
import { seedRecords, statusOf, spokenExpiry, daysUntil } from "@/data/compliance";
import {
  filterByProblem,
  problemFromSpeech,
  rank,
  spokenLocation,
  spokenService,
} from "@/lib/breakdown";
import { voiceById, voiceOptions, type VoiceId, type VoiceOption } from "@/data/voices";
import { deviceDelivery, pickDeviceVoice } from "@/lib/device-voice";
import { speakLine } from "@/lib/speech.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  attachAudioLevel,
  attachMicLevel,
  setVoiceLevel,
  startSynthLevel,
} from "@/lib/voice-level";

/**
 * LIVE SNAPSHOT
 * The voice brain answers from the driver's own rows. When a table is empty
 * HERCULES says so out loud instead of reading numbers it does not have.
 */
export type VoiceSnapshot = {
  hours: Hours | null;
  currentLoad: LoadRow | null;
  loads: LoadRow[];
  alerts: AlertRow[];
};

let live: VoiceSnapshot = { hours: null, currentLoad: null, loads: [], alerts: [] };

export function setVoiceSnapshot(next: VoiceSnapshot) {
  live = next;
}

function lane(l: LoadRow) {
  const from = [l.origin_city, l.origin_state].filter(Boolean).join(", ") || "your origin";
  const to = [l.dest_city, l.dest_state].filter(Boolean).join(", ") || "your destination";
  return `${from} to ${to}`;
}

function rateLine(l: LoadRow) {
  if (!l.rate_cents) return "no rate posted";
  const dollars = Math.round(l.rate_cents / 100);
  if (!l.miles) return `$${dollars.toLocaleString()} total`;
  return `${l.miles.toLocaleString()} miles, $${dollars.toLocaleString()} total, $${(
    dollars / l.miles
  ).toFixed(2)} a mile`;
}

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

export type OrbColorway = "black" | "pink" | "grey" | "gold" | "turquoise";

export const orbColorways: { id: OrbColorway; label: string; hint: string }[] = [
  { id: "black", label: "Matte Black", hint: "Charcoal depth, warm gold trim — flagship" },
  { id: "pink", label: "Matte Pink", hint: "Muted rose with a cool cyan-white glow" },
  { id: "grey", label: "Matte Grey", hint: "Graphite with clean silver-white light" },
  { id: "gold", label: "Matte Gold", hint: "Antique gold with dense black trim" },
  { id: "turquoise", label: "Matte Turquoise", hint: "Deep teal with a restrained coral glow" },
];

/* ---------------------------------------------------------------- VOICE CAST */

/* The named personas live in one place so the picker, the profile and the
   speech service all read the same cast. */
export { voiceOptions, voiceById, maleVoices, femaleVoices } from "@/data/voices";
export type { VoiceId, VoiceOption } from "@/data/voices";

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
  | "supply"
  | "parts"
  | "alerts"
  | "equipment"
  | "compliance"
  | "none";

/**
 * Paperwork on the driver's own account that is expired or inside its warning
 * window. Reads the shared compliance records — the same ones the carrier sees.
 */
function complianceAttention() {
  const mine = ["DR-114", "HERC-114", "TRL-9920"];
  return seedRecords
    .filter((r) => mine.includes(r.subjectId))
    .filter((r) => {
      const s = statusOf(r);
      return s === "expired" || s === "expiring";
    })
    .sort((a, b) => daysUntil(a.expires) - daysUntil(b.expires));
}

/** Match a spoken equipment name to a saved-profile spec. */
function spokenVehicle(t: string): VehicleSpec | null {
  if (/(sprinter|cargo van)/.test(t)) return specFor("cargoVan");
  if (/(box truck|straight truck|twenty ?six)/.test(t)) return specFor("boxTruck");
  if (/(minivan|passenger van|crew van)/.test(t)) return specFor("passengerVan");
  if (/(\bcar\b|pickup|pick ?up truck)/.test(t)) return specFor("car");
  if (/(heavy haul)/.test(t)) return specFor("heavyHaul");
  if (/(car haul)/.test(t)) return specFor("carHaul");
  if (/(intermodal)/.test(t)) return specFor("eighteen", "intermodal");
  if (/(line ?haul)/.test(t)) return specFor("eighteen", "lineHaul");
  if (/(dry van)/.test(t)) return specFor("eighteen", "dryVan");
  if (/(flat ?bed)/.test(t)) return specFor("flatbed");
  if (/(18 ?wheeler|eighteen wheeler)/.test(t)) return specFor("eighteen", "dryVan");
  return null;
}

function hm(min: number) {
  return `${Math.floor(min / 60)} hours ${min % 60} minutes`;
}

type Reply = { text: string; topic: Topic; proposal?: Proposal };

/** The problem the driver last named, so "call them" ranks the right shops. */
let lastProblem: ReturnType<typeof problemFromSpeech> = null;

/** Options a service can actually deliver to where the truck is sitting. */
function reachableOrders() {
  return orderOptions.filter((o) => coverageAt(dropLocation, o.service).status !== "none");
}

/** The coverage rundown HERCULES reads aloud for the spot the truck is in. */
function coverageLine() {
  const food = supplyServices.filter((s) => s.category === "food");
  const dead = food.filter((s) => coverageAt(dropLocation, s.id).status === "none");
  const live = reachableOrders();
  const ahead = nearestCovered("food");
  const head =
    dead.length === food.length
      ? `You're at ${dropLocation.label}, and no restaurant delivery covers this lot. ${dead
          .map((s) => `No ${s.name} available in this area.`)
          .join(" ")}`
      : `You're at ${dropLocation.label}. ${food
          .map((s) => spokenCoverage(dropLocation, s.id))
          .join(" ")}`;
  const rest = live[0]
    ? ` What can still reach you: ${serviceOf(live[0].service).name} — ${live[0].vendor}, about ${live[0].etaMin} minutes.`
    : "";
  const tail = ahead
    ? ` Nearest coverage on your route is ${ahead.label}, ${ahead.milesAhead} miles ahead — eat there before you shut down here.`
    : "";
  return `${head}${rest}${tail}`;
}

/* ------------------------------------------------- PARTS & SUPPLY (TRANSACTED) */

type SupplyPick = {
  label: string;
  category: SupplyCategoryId;
  listing: Listing;
  partNumber?: string;
};

/** The part or supply item HERCULES last put on the table for the driver. */
let lastSupplyPick: SupplyPick | null = null;

function lastSupply(): SupplyPick | null {
  return lastSupplyPick;
}

/** Turn something the driver said into a part or a supply item with a price. */
function pickSupply(text: string): SupplyPick | null {
  const parts = matchParts(text);
  const part = parts[0];
  if (part) {
    const listing = bestListing(part.listings);
    if (listing) {
      return { label: part.name, category: "parts", listing, partNumber: part.partNumber };
    }
  }
  const cat = categoryFromSpeech(text);
  if (cat && cat !== "parts") {
    const item = itemsIn(cat)[0];
    const listing = item ? bestListing(item.listings) : undefined;
    if (item && listing) return { label: item.name, category: cat, listing };
  }
  return null;
}

/**
 * DRIVER APPROVED: the read-back proposal for anything HERCULES transacts. The
 * HERCULES service fee is inside both the spoken line and the on-screen summary,
 * and nothing is ordered until the driver approves it.
 */
function partsProposal(
  label: string,
  category: SupplyCategoryId,
  listing: Listing,
  partNumber?: string,
): Reply {
  const feeCategory = categoryById(category).fee;
  const { subtotal, fee, total } = totalWithFee(listing.price, feeCategory);
  const vendor = supplierById(listing.supplierId).name;
  lastSupplyPick = { label, category, listing, ...(partNumber ? { partNumber } : {}) };
  return {
    topic: "parts",
    text: `Reading it back: ${label}${
      partNumber ? `, part number ${partNumber}` : ""
    }, from ${vendor}. ${spokenFee(subtotal, feeCategory)} ${listing.ready}. Say yes and I'll order it.`,
    proposal: {
      summary: `${label} — ${vendor}, ${listing.location}. ${listing.ready}. Order $${subtotal.toFixed(
        2,
      )} + $${fee.toFixed(2)} HERCULES service fee`,
      total: `$${total.toFixed(2)}`,
    },
  };
}

/** Follow-ups the driver can say once a topic is on the table. */
function followUp(topic: Topic, text: string): Reply | null {
  const t = text.toLowerCase();
  const wantsMore = /(more|detail|go on|keep going|what else|and\?|tell me more)/.test(t);
  const wantsNext = /(next one|the other|another|second)/.test(t);

  /* BREAKDOWN: once the driver is broke down, the whole conversation stays
     on it — problem description, fault codes, and an explicit call. */
  if (topic === "breakdown") {
    const p = problemFromSpeech(t);
    if (p) {
      lastProblem = p;
      const list = rank(filterByProblem(services, p));
      const best = list[0];
      const spec = problems.find((x) => x.id === p)!;
      if (!best) {
        return {
          topic: "breakdown",
          text: `${spec.spoken} Nobody in range handles that specifically. Say "show me everything" and I'll include heavy tow.`,
        };
      }
      return {
        topic: "breakdown",
        text: `${spec.spoken} Closest is ${spokenService(best)} I have ${list.length} options ranked behind it.`,
      };
    }
    if (/(fault|code|ecm|engine light)/.test(t)) {
      return {
        topic: "breakdown",
        text: `${activeAdapter().name} has ${activeFaults().length} active ${activeFaults().length === 1 ? "code" : "codes"}. ${activeFaults()
          .map((f) => `${f.code} on the ${f.system.toLowerCase()} — ${f.plain}`)
          .join(" ")} Read those numbers to whoever you call.`,
      };
    }
    if (/(where am i|location|mile marker|read it back|say it again)/.test(t)) {
      return { topic: "breakdown", text: spokenLocation(currentFix) };
    }
    if (/(triangle|safe|hazard|shoulder|traffic)/.test(t)) {
      return {
        topic: "breakdown",
        text: `Flashers on first. Get out the passenger side — the traffic side is the danger side. Triangles at ten feet on the traffic side, a hundred behind, a hundred ahead. This is a known bad stretch, so put the far one at two hundred feet around that curve. Vest on, wait behind the guardrail.`,
      };
    }
    if (/(call|connect|dial|get them|phone)/.test(t)) {
      const best = rank(lastProblem ? filterByProblem(services, lastProblem) : services)[0]!;
      return {
        topic: "breakdown",
        text: `Before I connect you: ${spokenService(best)} Say yes and I'll place the call. I am not dispatching anyone and nothing is authorized until you tell them so on the phone.`,
        proposal: {
          summary: `Place a call to ${best.name} — ${best.phone}. No dispatch or charge is authorized by HERCULES.`,
        },
      };
    }
  }

  if (topic === "loads" && (wantsMore || wantsNext)) {
    const l = live.loads[wantsNext ? 1 : 0];
    if (!l) {
      return {
        topic: "loads",
        text: "That's everything posted on the board right now. I won't make one up — the moment new freight lands I'll read it to you.",
      };
    }
    return {
      topic: "loads",
      text: `${lane(l)}, ${rateLine(l)}.${
        l.pickup_at ? ` Pickup ${new Date(l.pickup_at).toLocaleString()}.` : ""
      } Say "book it" and I'll read the whole thing back before anything is committed.`,
    };
  }
  if (topic === "loads" && /(book|take|grab) ?(it|that)?/.test(t)) {
    const l = live.loads[0];
    if (!l) {
      return {
        topic: "loads",
        text: "There's nothing on the board to book right now.",
      };
    }
    const dollars = l.rate_cents ? Math.round(l.rate_cents / 100) : 0;
    return {
      topic: "loads",
      text: `Here's exactly what I'd commit to: ${lane(l)}, ${rateLine(l)}. I have not booked it. Say yes to approve, or no and I'll drop it.`,
      proposal: {
        summary: `Book load ${l.reference ?? l.id.slice(0, 8)}: ${lane(l)}, $${dollars.toLocaleString()}`,
        total: `$${dollars.toLocaleString()} revenue`,
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
  /* PARTS & SUPPLY that HERCULES actually transacts — the scaled HERCULES
     service fee is read out inside the proposal, every time, before the yes. */
  if (topic === "parts") {
    if (/(order|buy|get it|place it|do it|source it|yes get)/.test(t)) {
      const found = lastSupply();
      if (found) return partsProposal(found.label, found.category, found.listing, found.partNumber);
    }
    if (/(cheaper|cheapest|price|how much|somewhere else|another)/.test(t)) {
      const found = lastSupply();
      if (found) {
        const fee = serviceFeeFor(found.listing.price, categoryById(found.category).fee);
        return {
          topic: "parts",
          text: `Cheapest I can actually get you is ${spokenListing(found.label, found.listing)} On top of that there's a ${fee.toFixed(
            2,
          )} dollar HERCULES service fee, because HERCULES places it and pays the supplier. Say order it and I'll read the whole thing back.`,
        };
      }
    }
    if (/(mechanic|fit it|install|who'?ll put it on|labour|labor)/.test(t)) {
      const best = rank(services)[0]!;
      return {
        topic: "parts",
        text: `Part and hands in one go: closest is ${spokenService(best)} Order the part from me and call them yourself, or have me book and pay the service call — that one carries the HERCULES fee and I'll read it to you first. Nothing is dispatched either way until you say so.`,
      };
    }
  }

  /* SUPPLY: ordering food or goods to the truck stays a conversation until the
     driver either approves the read-back or drops it. */
  if (topic === "supply") {
    if (/(reorder|the usual|favou?rite|same as last|again)/.test(t)) {
      const fav = supplyFavorites[0]!;
      const cov = coverageAt(dropLocation, fav.service);
      if (cov.status === "none") {
        const ahead = nearestCovered("food");
        return {
          topic: "supply",
          text: `${fav.label} runs on ${serviceOf(fav.service).name}, and no ${serviceOf(fav.service).name} is available in this area.${ahead ? ` It works again at ${ahead.label}, ${ahead.milesAhead} miles ahead.` : ""} Want me to look at what can still reach you here?`,
        };
      }
      return {
        topic: "supply",
        text: `${fav.label} — ${fav.vendor} on ${serviceOf(fav.service).name}: ${fav.items.join(", ")}. Last time that was ${fav.lastTotal.toFixed(2)} dollars, about ${cov.etaMin} minutes to the truck. Say yes and I'll place it. Nothing is ordered yet.`,
        proposal: {
          summary: `Reorder ${fav.label} — ${fav.vendor} on ${serviceOf(fav.service).name}, delivered to ${dropLocation.label}`,
          total: `$${fav.lastTotal.toFixed(2)}`,
        },
      };
    }
    if (/(coverage|available|any delivery|no doordash|no uber|works|where)/.test(t)) {
      return { topic: "supply", text: coverageLine() };
    }
    if (/(order|place|get me|send it|do it|buy|that one|first one)/.test(t)) {
      const o = reachableOrders()[0];
      if (!o) {
        const ahead = nearestCovered("food");
        return {
          topic: "supply",
          text: `Nothing delivers to ${dropLocation.label}, so there is nothing for me to hand off.${ahead ? ` ${ahead.label} is ${ahead.milesAhead} miles ahead and has coverage.` : ""}`,
        };
      }
      const total = o.subtotal + o.deliveryFee;
      return {
        topic: "supply",
        text: `Reading it back: ${serviceOf(o.service).name}, ${o.vendor} — ${o.summary}. ${o.subtotal.toFixed(2)} dollars plus ${o.deliveryFee.toFixed(2)} delivery, ${total.toFixed(2)} total, about ${o.etaMin} minutes to ${dropLocation.label}. Tell me where to meet you — bay, gate or lot — and say yes, and I'll hand it into ${serviceOf(o.service).name} filled in so you just hit submit. No HERCULES fee on this one; ${serviceOf(o.service).name} charges you directly.`,
        proposal: {
          summary: `Hand off to ${serviceOf(o.service).name} — ${o.vendor}, ${o.summary}, delivered to ${dropLocation.label}. HERCULES fee $0.00`,
          total: `$${total.toFixed(2)} charged by ${serviceOf(o.service).name}`,
        },
      };
    }
  }

  if (topic === "clock" && wantsMore) {
    return {
      topic: "clock",
      text: live.hours
        ? `On duty ${hm(live.hours.onDutyRemainingMin)} remaining, and ${live.hours.cycleRemainingHrs.toFixed(
            1,
          )} hours left on your cycle. That's off your own logged time, nothing assumed.`
        : "You haven't logged any driving yet, so I don't have a clock to read. Start a trip and I'll track it from there.",
    };
  }
  return null;
}

/** The conversation brain — keyword intent over the live data model. */
export function respond(text: string, topic: Topic): Reply {
  const t = text.toLowerCase().trim();

  const fu = followUp(topic, t);
  if (fu) return fu;

  /* Reachable from anywhere in the app, and it takes priority over everything. */
  if (
    /(broke ?down|broken down|breakdown|stranded|disabled|shoulder|tow truck|wrecker|won'?t start|wont start|blown tire|blow ?out|air leak)/.test(
      t,
    )
  ) {
    const p = problemFromSpeech(t);
    lastProblem = p;
    const list = rank(p ? filterByProblem(services, p) : services);
    const best = list[0]!;
    return {
      topic: "breakdown",
      text: `I've got you. ${spokenLocation(currentFix)} Flashers on and get your triangles out before anything else — this is a known bad stretch. I have ${list.length} options ranked. Closest is ${best.name}, ${best.milesAway.toFixed(1)} miles out, about ${best.etaMin} minutes${best.kind === "mobile" || best.kind === "tow" ? " to reach you" : " of driving"}${best.open24 ? ", open 24 hours" : ""}. Tell me what's wrong — blown tire, won't start, air leak, DEF light — and I'll narrow it down. I haven't called anybody.`,
    };
  }

  /* EQUIPMENT / VOCATION — what the driver is in today drives the whole route. */
  if (
    /(what am i in|i'?m in the|im in the|today i'?m|equipment|vocation|sprinter|cargo van|flat ?bed|18 ?wheeler|eighteen wheeler|dry van|line ?haul|intermodal|car haul|heavy haul|bobtail)/.test(
      t,
    )
  ) {
    const said = spokenVehicle(t);
    if (said) {
      const rules = rulesFor(said);
      return {
        topic: "equipment",
        text: `${said.label} it is. ${rules.spoken} I've set that for this trip and filtered the hazard warnings to what actually matters for it. Say the word if you swap units.`,
      };
    }
    return {
      topic: "equipment",
      text: `Tell me what you're in today — cargo van, flatbed, eighteen wheeler dry van, line haul, intermodal, car haul, or heavy haul. A van I'll run down county and back roads. Anything pulling a trailer stays on blue-shield interstate and legal county highway, with low bridge clearances checked either way. Heavy haul adds grades, switchbacks and posted weight limits.`,
    };
  }

  /* COMPLIANCE PAPERWORK — expiries, what's missing, who can read it. */
  if (
    /(medical card|med card|physical|cdl|licen[cs]e|insurance|authority|mvr|drug and alcohol|drug test|registration|inspection|paperwork|compliance|expir)/.test(
      t,
    )
  ) {
    const due = complianceAttention();
    if (!due.length) {
      return {
        topic: "compliance",
        text: `Your paperwork is clean. Licence, medical card, insurance, authority, MVR, drug and alcohol, registration and inspection are all on file and current, and your carrier is reading the same records you are. I'll speak up on my own the moment anything gets inside its warning window.`,
      };
    }
    return {
      topic: "compliance",
      text: `${due.map((r) => spokenExpiry(r)).join(" ")} Nothing gets sent to a broker or a carrier unless you tell me to — say the word and I'll pull the set together.`,
    };
  }

  if (/(clock|hours|hos|drive time|break|log)/.test(t)) {
    return {
      topic: "clock",
      text: live.hours
        ? `You have ${hm(live.hours.driveRemainingMin)} of drive time left and ${hm(
            live.hours.onDutyRemainingMin,
          )} on duty. ${live.hours.cycleRemainingHrs.toFixed(1)} hours left on the cycle.`
        : "I don't have a clock for you yet — no trips logged. Start a trip and I'll keep your drive, on-duty, and cycle time from your own records.",
    };
  }
  if (/(load|freight|board|rate|haul|book)/.test(t)) {
    const l = live.loads[0];
    return {
      topic: "loads",
      text: l
        ? `Best on the board is ${lane(l)} — ${rateLine(l)}. Want the details, or should I read back a booking for your approval?`
        : "Nothing is posted on the board right now. I'll read new freight to you the moment it lands — I won't invent a load.",
    };
  }
  if (/(money|profit|margin|per mile|settlement|pay|fuel cost|revenue)/.test(t)) {
    const l = live.currentLoad;
    return {
      topic: "money",
      text:
        l && l.rate_cents && l.miles
          ? `This run pays $${Math.round(l.rate_cents / 100).toLocaleString()} over ${l.miles.toLocaleString()} miles — $${(
              l.rate_cents /
              100 /
              l.miles
            ).toFixed(2)} a mile in revenue. Log your fuel and costs and I'll give you the net.`
          : "I don't have money to report yet. Log a settlement or a fuel purchase and I'll keep the running revenue, cost, and profit per mile.",
    };
  }
  if (/(turn|route|navigat|reroute|eta|miles|where am i)/.test(t)) {
    const l = live.currentLoad;
    return {
      topic: "route",
      text: l
        ? `You're running ${lane(l)}${l.miles ? `, ${l.miles.toLocaleString()} miles` : ""}. The route is checked against your height, weight, and length. If a scale or a backup shows up I'll offer a legal way around it — I won't change your route on my own.`
        : "No load is booked, so there's no route to read. Book freight and I'll build a truck-legal route for your equipment.",
    };
  }
  if (/(hazard|bridge|clearance|grade|switchback|ramp|scale|crossing|steep)/.test(t)) {
    const h = hazards[0]!;
    return {
      topic: "hazards",
      text: `Nearest thing worth knowing: ${h.name}. ${h.detail}. I'll call it out well before you get there, sized so you don't have to look down.`,
    };
  }
  /* SUPPLY & PARTS — anything HERCULES sources, places and pays for. Checked
     before food delivery so "order me an air dryer" doesn't land on Uber Eats. */
  if (
    /(part|parts|alternator|starter|turbo|injector|water pump|air dryer|fan clutch|def pump|doser|brake shoe|casing|retread|strap|chain|tarp|binder|load bar|securement|permit|oversize|toll|prepass|bestpass|scale bypass|glove|vest|flashlight|ppe|wrench|socket|laundry|spn ?\d|part number)/.test(
      t,
    )
  ) {
    const pick = pickSupply(t);
    if (!pick) {
      return {
        topic: "parts",
        text: `Tell me the symptom, the part name or the code and I'll name the part and price it. I can also handle tires and road service, fuel and DEF, showers, parking and laundry, straps, chains and tarps, tools and PPE, and permits, scales and tolling. Anything I place and pay for carries the HERCULES service fee, and I read it to you before you approve it.`,
      };
    }
    lastSupplyPick = pick;
    const codeMatch = /spn ?\d+/.exec(t);
    const fromCode = codeMatch ? partForFault(codeMatch[0]) : undefined;
    const fee = serviceFeeFor(pick.listing.price, categoryById(pick.category).fee);
    return {
      topic: "parts",
      text: `${
        fromCode
          ? `${codeMatch?.[0].toUpperCase()} points at the ${fromCode.name}. ${fromCode.why} `
          : ""
      }Best I can get you: ${spokenListing(pick.label, pick.listing)} Plus a ${fee.toFixed(
        2,
      )} dollar HERCULES service fee, because I place it and pay the supplier — that's what keeps HERCULES running. Say "order it" and I'll read the whole thing back. Nothing is ordered yet.`,
    };
  }
  if (
    /(deliver|delivery|uber ?eats|door ?dash|grub ?hub|instacart|gopuff|go ?puff|walmart|walgreens|cvs|amazon|pharmacy|prescription|grocer|order|hungry|starving|dinner|lunch|breakfast|coffee|supplies|snack)/.test(
      t,
    )
  ) {
    return {
      topic: "supply",
      text: `${coverageLine()} Say "order it" and I'll read the whole thing back before anything is placed.`,
    };
  }
  if (/(shower|park|stop|diesel|fuel|sleep|rest|eat|food)/.test(t)) {
    const s = truckStops[0]!;
    return {
      topic: "stops",
      text: `${s.name} is ${s.milesAhead} miles ahead — diesel $${s.dieselPrice.toFixed(3)}, ${s.parkingOpen} of ${s.parkingTotal} truck spaces open, ${s.showersOpen} showers free. Say "book it" and I'll read the total plus the ${BOOKING_FEE} dollar booking fee before anything is charged.`,
    };
  }
  if (
    /(fault|engine|health|tire|maintenance|def|coolant|brake|bolt|diagnostic|mpg|fuel economy|what'?s wrong)/.test(
      t,
    )
  ) {
    const f = activeFaults()[0]!;
    const pred = activePredictions()[0]!;
    return {
      topic: "health",
      text: `${activeAdapter().name} is reading ${activeFaults().length} active ${activeFaults().length === 1 ? "code" : "codes"} off your engine. ${f.plain} And I'm watching one trend: ${pred.spoken} Nothing is shutting you down right now. Say "source the part" and I'll name it, price it at the counters ahead of you, and show you the fee before anything is ordered.`,
    };
  }
  if (/(dot|inspection|alert|cop|bear|weigh|closed)/.test(t)) {
    const a = live.alerts.find((x) => !x.acknowledged_at);
    return {
      topic: "alerts",
      text: a
        ? `${a.kind}: ${a.title}. ${a.body ?? ""} Raised ${new Date(a.created_at).toLocaleTimeString()}.`
        : "Nothing is flagged on your account right now. If a checkpoint or hazard comes in on your lane I'll say it out loud.",
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
  "I'm broke down",
  "Can anything deliver food to me here?",
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
  /**
   * HERCULES speaks unprompted — inbound arrival countdowns, timers running
   * out. No driver turn, no proposal: it is information, not a commitment.
   */
  announce: (text: string) => void;
  /** The line currently being spoken or the last thing said. */
  lastLine: string;
  pending: Turn | undefined;
  /** Play a persona's sample line so the driver can hear it before choosing. */
  preview: (id: VoiceId) => Promise<void>;
  /** The persona currently previewing, if any. */
  previewing: VoiceId | null;
  /**
   * How the last line was actually spoken. "premium" is the real neural
   * persona; "device" is the free voice built into this device, which sounds
   * nothing like the persona; "unavailable" means nothing could be spoken.
   * Never claim a neural voice was heard when this says "device".
   */
  speechSource: SpeechSource;
  /** Why premium speech was not used, in plain language, when known. */
  speechNote: string | null;
};

export type SpeechSource = "premium" | "sample" | "device" | "unavailable" | null;

const VoiceContext = createContext<Ctx | null>(null);

const COLOR_KEY = "hercules.orb-colorway";
/** When this device last changed the colorway — the tie-breaker between tabs. */
const COLOR_AT_KEY = "hercules.orb-colorway.at";
const VOICE_KEY = "hercules.voice";

function isOrbColorway(value: unknown): value is OrbColorway {
  return (
    value === "black" ||
    value === "pink" ||
    value === "grey" ||
    value === "gold" ||
    value === "turquoise"
  );
}

function applyColorway(colorway: OrbColorway) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-colorway", colorway);
  }
}

function storedColorwayAt(): number {
  const raw = Number(localStorage.getItem(COLOR_AT_KEY));
  return Number.isFinite(raw) ? raw : 0;
}

let seq = 0;
const nextId = () => `t${++seq}-${Date.now()}`;

/** Plain-language reason the free device voice spoke instead of the persona. */
function fallbackNote(reason: string | undefined, message?: string): string {
  switch (reason) {
    case "unconfigured":
      return "The real AI voice service isn't connected to this app yet, so your device spoke the line free.";
    case "eco":
      return "Eco quality is on, so your device speaks every line free. Switch to Balanced to hear the real voice.";
    case "no_credits":
    case "insufficient":
      return "You have no AI credits, so your device spoke the line free. The real voice costs credits.";
    case "not_signed_in":
      return "Sign in to hear the real voice — your device spoke this line free.";
    case "rate_limited":
      return "Too many spoken lines just now, so your device spoke this one free.";
    case "no_allowance_config":
      return "Paid voice is held back on this plan until its allowance is set up. Your device spoke this line free.";
    case "no_subscription":
      return "The real AI voice needs a monthly AI plan. Your device spoke this line free.";
    case "daily_limit":
    case "weekly_limit":
      // The server's message names the exact reset time.
      return message || "Your AI voice allowance is used up for now — your device spoke this free.";
    case "provider":
      return "The voice service didn't answer, so your device spoke the line free. You weren't charged.";
    default:
      return message || "Your device spoke the line free instead of the neural voice.";
  }
}

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

  /* ---- COLORWAY, KEPT IN STEP -------------------------------------------
     The same account can be open in two tabs and on two devices. Every change
     carries the moment it was made, and the most recent choice wins — so a tab
     left open overnight never silently undoes what the driver just picked. */
  const colorwayAt = useRef(0);

  const adoptColorway = useCallback((next: OrbColorway, at: number) => {
    if (at < colorwayAt.current) return;
    colorwayAt.current = at;
    setColorwayState(next);
    applyColorway(next);
  }, []);

  useEffect(() => {
    const c = localStorage.getItem(COLOR_KEY) as OrbColorway | null;
    const migrated = c === ("white" as OrbColorway) ? "grey" : c;
    if (isOrbColorway(migrated)) {
      colorwayAt.current = storedColorwayAt();
      setColorwayState(migrated);
      applyColorway(migrated);
    } else {
      applyColorway("black");
    }
    const v = localStorage.getItem(VOICE_KEY) as VoiceId | null;
    if (v && voiceOptions.some((o) => o.id === v)) setVoiceIdState(v);

    let alive = true;
    type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

    const pushAccountColorway = async (value: OrbColorway, at: number) => {
      const { error } = await supabase.auth.updateUser({
        data: { matte_colorway: value, matte_colorway_at: at },
      });
      if (error) console.error(`[theme] account colorway save failed: ${error.message}`);
    };

    /** Newest wins in both directions: account -> device and device -> account. */
    const syncAccountColorway = async (session: Session) => {
      if (!alive || !session) return;
      const meta = session.user.user_metadata ?? {};
      const remote = meta["matte_colorway"];
      const remoteAt = Number(meta["matte_colorway_at"]) || 0;
      const localAt = storedColorwayAt();
      const local = localStorage.getItem(COLOR_KEY);

      if (isOrbColorway(remote) && remoteAt >= localAt) {
        localStorage.setItem(COLOR_KEY, remote);
        localStorage.setItem(COLOR_AT_KEY, String(remoteAt));
        adoptColorway(remote, remoteAt);
        return;
      }
      if (isOrbColorway(local)) await pushAccountColorway(local, localAt || Date.now());
    };

    const refresh = () => void supabase.auth.getSession().then(({ data }) => syncAccountColorway(data.session));
    refresh();

    const authSubscription = supabase.auth.onAuthStateChange?.((event, session) => {
      if (event === "SIGNED_IN") void syncAccountColorway(session);
    }).data.subscription;

    // Another tab on this device changed it: follow along, no refresh needed.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== COLOR_KEY || !isOrbColorway(e.newValue)) return;
      adoptColorway(e.newValue, storedColorwayAt() || Date.now());
    };
    // Coming back to this tab re-checks the account, so another device lands here.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      authSubscription?.unsubscribe();
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [adoptColorway]);

  const setColorway = useCallback((c: OrbColorway) => {
    const at = Date.now();
    colorwayAt.current = at;
    setColorwayState(c);
    localStorage.setItem(COLOR_KEY, c);
    localStorage.setItem(COLOR_AT_KEY, String(at));
    applyColorway(c);
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { error } = await supabase.auth.updateUser({
        data: { matte_colorway: c, matte_colorway_at: at },
      });
      if (error) console.error(`[theme] account colorway save failed: ${error.message}`);
    });
  }, []);

  const setVoice = useCallback((id: VoiceId) => {
    setVoiceIdState(id);
    localStorage.setItem(VOICE_KEY, id);
  }, []);

  /* ---- REAL SPEECH -------------------------------------------------------
     Every HERCULES line is spoken in the chosen persona's character. If the
     speech service can't be reached the conversation still reads on screen. */
  const audio = useRef<HTMLAudioElement | null>(null);
  const detachLevel = useRef<(() => void) | null>(null);
  const spokenIds = useRef<Set<string>>(new Set());
  const voiceRef = useRef<VoiceId>(voiceId);
  voiceRef.current = voiceId;
  const [previewing, setPreviewing] = useState<VoiceId | null>(null);
  const [speechSource, setSpeechSource] = useState<SpeechSource>(null);
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  /**
   * Generation token. Every Stop and every newer speech request bumps it, so a
   * provider reply that arrives late is discarded instead of playing over the
   * top of whatever is current — the classic "voice from two requests ago".
   */
  const speechGen = useRef(0);

  const killAudio = useCallback(() => {
    // Anything still in flight is now stale and must not be heard.
    speechGen.current += 1;
    detachLevel.current?.();
    detachLevel.current = null;
    if (audio.current) {
      audio.current.onended = null;
      audio.current.pause();
      audio.current.src = "";
      audio.current = null;
    }
    // Never let a device line and a premium line overlap.
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* no device speech on this browser */
    }
  }, []);

  /* FREE FALLBACK: the device's own voice, matched to the persona's gender so a
     female persona is not answered by a male device voice. Used whenever
     premium speech is unavailable — not signed in, no credits, Eco quality,
     provider down — so the driver always hears the line, never charged. */
  const speakOnDevice = useCallback((text: string, persona?: VoiceOption) => {
    // Stop any premium clip first: the two backends must never overlap.
    detachLevel.current?.();
    detachLevel.current = null;
    if (audio.current) {
      audio.current.onended = null;
      audio.current.pause();
      audio.current.src = "";
      audio.current = null;
    }
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const delivery = deviceDelivery(persona?.speed ?? 1);
      u.rate = delivery.rate;
      u.pitch = delivery.pitch;
      const match = pickDeviceVoice(synth.getVoices() ?? [], persona?.gender ?? "male");
      // No voices exposed yet (some browsers load them late): speak anyway with
      // the device default rather than claiming a voice we don't have.
      if (match) {
        u.voice = match as unknown as SpeechSynthesisVoice;
        u.lang = match.lang;
      }
      synth.speak(u);
      return true;
    } catch {
      /* screen text still carries the line */
      return false;
    }
  }, []);

  const playAs = useCallback(
    async (id: VoiceId, text: string): Promise<SpeechSource> => {
      const persona = voiceById(id);
      // Silence whatever is playing and claim this generation. A Stop or a newer
      // line bumps the token again, which invalidates everything below.
      killAudio();
      const gen = speechGen.current;
      const stale = () => gen !== speechGen.current;

      const fallback = (note: string): SpeechSource => {
        if (stale()) return null;
        const spoke = speakOnDevice(text, persona);
        if (stale()) return null;
        setSpeechSource(spoke ? "device" : "unavailable");
        setSpeechNote(note);
        return spoke ? "device" : "unavailable";
      };

      // Premium speech is an account feature. Signed out, never call it: the
      // server would refuse and that refusal surfaces as an app error.
      const { data: sessionData } = await supabase.auth.getSession();
      if (stale()) return null;
      if (!sessionData.session) {
        return fallback("Sign in to hear the premium voice — your device spoke this line free.");
      }

      try {
        const res = await speakLine({ data: { voiceId: id, text } });
        // Cancelled or superseded while the provider was working: drop it.
        if (stale()) return null;
        if (!res.ok) {
          return fallback(fallbackNote(res.reason, res.message));
        }
        const el = new Audio(res.audio);
        el.crossOrigin = "anonymous";
        audio.current = el;
        // The orb's ripples ride the real loudness of the line.
        detachLevel.current = attachAudioLevel(el);
        await el.play().catch(() => {});
        // Stopped during the play() handshake: make sure nothing keeps sounding.
        if (stale()) {
          el.onended = null;
          el.pause();
          el.src = "";
          if (audio.current === el) audio.current = null;
          return null;
        }
        setSpeechSource("premium");
        setSpeechNote(null);
        return "premium";
      } catch {
        // Unauthenticated or unreachable premium speech — device voice, free.
        return fallback("Premium speech couldn't be reached, so your device spoke the line free.");
      }
    },
    [killAudio, speakOnDevice],
  );

  const preview = useCallback(
    async (id: VoiceId) => {
      const persona = voiceById(id);
      setPreviewing(id);

      /* Previews play a static clip that ships with the app — identical for
         every driver, no account data in it, no paid call, no credits spent.
         The clips are rendered from the same ElevenLabs voice and delivery the
         driver hears on the road, so the preview is the real character. */
      killAudio();
      const sampleGen = speechGen.current;
      const clip = new Audio(`/voice-samples/${id}.mp3`);
      const heard = await new Promise<boolean>((resolve) => {
        let settled = false;
        const done = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        clip.onerror = () => done(false);
        clip.oncanplay = () => done(true);
        void clip.play().then(
          () => done(true),
          () => done(false),
        );
        setTimeout(() => done(false), 4000);
      });
      if (sampleGen !== speechGen.current) return; // stopped or superseded
      if (heard) {
        audio.current = clip;
        detachLevel.current = attachAudioLevel(clip);
        setSpeechSource("sample");
        setSpeechNote("Sample clip of the real voice — no credits used.");
        clip.onended = () => setPreviewing(null);
        return;
      }
      clip.pause();
      clip.src = "";

      // No clip available in this build: fall back to the live paid path.
      const gen = speechGen.current + 1; // playAs claims this generation
      const source = await playAs(id, persona.sample);
      // A newer preview or a Stop owns the UI now — leave its state alone.
      if (gen !== speechGen.current) return;
      const el = audio.current;
      if ((source === "premium" || source === "sample") && el)
        el.onended = () => setPreviewing(null);
      else setPreviewing(null);
    },
    [playAs],
  );

  const push = useCallback((turn: Turn) => setTurns((prev) => [...prev, turn]), []);

  /* Latest turns, readable inside callbacks without re-creating them. */
  const turnsRef = useRef<Turn[]>(turns);
  turnsRef.current = turns;

  /* Spoken confirmation must be explicit — a clear yes or no, nothing inferred. */
  const YES =
    /^(yes|yeah|yep|yes[, ]+(do it|book it|approve.*)|do it|book it|approve it|go ahead|confirm it?)\b/i;
  const NO =
    /^(no|nope|no[, ]+(thanks|don'?t|drop it)|don'?t|cancel( that)?|drop it|skip it|forget it)\b/i;

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
    killAudio();
    setPreviewing(null);
    setMode("idle");
  }, [clearTimers, killAudio]);

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
    (turnId: string) =>
      settle(turnId, "declined", "Dropped it. Nothing was booked and nothing was charged."),
    [settle],
  );

  const clear = useCallback(() => {
    clearTimers();
    setTurns([]);
    setTopic("none");
    setMode("idle");
  }, [clearTimers]);

  /* Unprompted HERCULES speech: arrival countdowns, timers, warnings. */
  const announce = useCallback(
    (text: string) => {
      clearTimers();
      setMode("speaking");
      push({ id: nextId(), from: "hercules", text });
      const readMs = Math.min(9000, 1800 + text.length * 28);
      timers.current.push(setTimeout(() => setMode("idle"), readMs));
    },
    [clearTimers, push],
  );

  /* Speak each new HERCULES line aloud in the chosen persona. */
  useEffect(() => {
    const last = turns[turns.length - 1];
    if (!last || last.from !== "hercules" || spokenIds.current.has(last.id)) return;
    spokenIds.current.add(last.id);
    void playAs(voiceRef.current, last.text);
  }, [turns, playAs]);

  useEffect(() => killAudio, [killAudio]);

  /* While the driver holds the floor the surface rides their real microphone
     level. If the mic is unavailable it falls back to a wandering envelope of
     the same shape so the liquid still moves. */
  useEffect(() => {
    if (mode !== "listening") return;
    let fallback: (() => void) | null = null;
    const detach = attachMicLevel(() => {
      fallback = startSynthLevel(0.5);
    });
    return () => {
      detach();
      fallback?.();
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "idle") setVoiceLevel(0);
  }, [mode]);

  const lastLine = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.from === "hercules");
    return last?.text ?? "";
  }, [turns]);

  const pending = useMemo(() => [...turns].reverse().find((t) => t.proposal && !t.status), [turns]);

  const value: Ctx = {
    mode,
    turns,
    colorway,
    setColorway,
    voice: voiceById(voiceId),
    setVoice,
    preview,
    previewing,
    speechSource,
    speechNote,
    listen,
    stop,
    say,
    approve,
    decline,
    clear,
    announce,
    lastLine,
    pending,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

/**
 * Inert stand-in used when a surface renders before/outside the provider
 * (stale module copies, isolated previews). It never speaks and never
 * commits anything — the screen stays up instead of going blank.
 */
const inertVoice: Ctx = {
  mode: "idle",
  turns: [],
  colorway: "black",
  setColorway: () => {},
  voice: voiceOptions[0]!,
  setVoice: () => {},
  listen: () => {},
  stop: () => {},
  say: () => {},
  approve: () => {},
  decline: () => {},
  clear: () => {},
  announce: () => {},
  lastLine: "",
  pending: undefined,
  preview: async () => {},
  previewing: null,
  speechSource: null,
  speechNote: null,
};

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      console.warn("useVoice used outside VoiceProvider — falling back to an inert voice.");
    }
    return inertVoice;
  }
  return ctx;
}
