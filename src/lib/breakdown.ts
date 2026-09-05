import {
  currentFix,
  problems,
  services,
  type Fix,
  type ProblemId,
  type Service,
  type ServiceKind,
} from "@/data/breakdown";

/**
 * BREAKDOWN ASSIST — provider seam.
 *
 * The screen only talks to this module. Swapping the mock provider for a real
 * roadside-service / tow-network / chain-service-bay API means implementing
 * `BreakdownProvider` and returning it from `getBreakdownProvider()`.
 */

export type BreakdownProvider = {
  id: string;
  /** Current truck position, expressed the way a driver relays it on the phone. */
  locate: () => Promise<Fix>;
  /** Nearby heavy-duty help, ranked. */
  search: (input: { problem: ProblemId; fix: Fix }) => Promise<Service[]>;
};

const mockProvider: BreakdownProvider = {
  id: "mock",
  locate: async () => currentFix,
  search: async ({ problem }) => rank(filterByProblem(services, problem)),
};

export function getBreakdownProvider(): BreakdownProvider {
  return mockProvider;
}

export function filterByProblem(list: Service[], problem: ProblemId) {
  if (problem === "unknown") return list;
  return list.filter((s) => s.services.includes(problem));
}

/**
 * Ranking: who can actually get the driver rolling soonest.
 * Mobile repair comes to the truck, so it beats an equal-ETA shop; 24-hour
 * operations outrank set-hours ones; reputation breaks near-ties.
 */
export function rank(list: Service[]) {
  const kindWeight: Record<ServiceKind, number> = { mobile: 0, tow: 12, bay: 18, shop: 22 };
  return [...list].sort(
    (a, b) =>
      a.etaMin + kindWeight[a.kind] - (a.open24 ? 10 : 0) - a.rating * 3 -
      (b.etaMin + kindWeight[b.kind] - (b.open24 ? 10 : 0) - b.rating * 3),
  );
}

/** Match a spoken problem description to a filter. */
export function problemFromSpeech(text: string): ProblemId | null {
  const t = text.toLowerCase();
  for (const p of problems) {
    if (p.phrases.some((phrase) => t.includes(phrase))) return p.id;
  }
  return null;
}

/** The location line HERCULES reads back the moment a breakdown is called in. */
export function spokenLocation(fix: Fix) {
  return `You are on ${fix.highway} ${fix.direction.toLowerCase()}, ${fix.mileMarker}, ${fix.county}, ${fix.state}. Nearest exit is ${fix.nearestExit}. Coordinates ${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}. Say it back to whoever you call exactly like that.`;
}

export function spokenService(s: Service) {
  return `${s.name}. ${label(s.kind)}, ${s.milesAway.toFixed(1)} miles out, about ${s.etaMin} minutes ${s.kind === "mobile" || s.kind === "tow" ? "to reach you" : "of driving"}. ${s.open24 ? "Open 24 hours" : `Hours ${s.hours}`}. Phone ${s.phone.replace(/[()-]/g, "").split("").join(" ")}. ${s.note} I have not called them. Say call to connect.`;
}

export function label(kind: ServiceKind) {
  return kind === "mobile"
    ? "Mobile repair — comes to you"
    : kind === "tow"
      ? "Heavy-duty tow"
      : kind === "bay"
        ? "Truck stop service bay"
        : "Heavy-duty shop";
}
