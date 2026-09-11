/**
 * FMCSA SERVICE LAYER — SCAFFOLD
 * ==============================
 * The compliance bot asks three things of FMCSA:
 *   1. authority   — is this MC/DOT active, and what does it allow?
 *   2. safety      — what is the carrier's safety rating and basic scores?
 *   3. clearinghouse — is this driver prohibited from safety-sensitive duty?
 *
 * Everything below is MOCK. The shape is the point: one provider interface, one
 * mock implementation, and a selector that will return a live implementation the
 * moment credentials exist. No screen or bot logic talks to a URL directly, so
 * wiring the real QCMobile / Clearinghouse APIs later is a single new file plus
 * the key — nothing above this layer changes.
 */

export type FmcsaAuthority = {
  dot: string;
  mc: string | null;
  legalName: string;
  status: "active" | "inactive" | "revoked" | "not found";
  authorityTypes: string[];
  commonAuthority: "active" | "pending" | "none";
  insuranceOnFile: { type: string; amount: string; carrier: string; effective: string }[];
  outOfServiceDate: string | null;
  checkedAt: string;
};

export type FmcsaSafety = {
  dot: string;
  rating: "satisfactory" | "conditional" | "unsatisfactory" | "unrated";
  ratingDate: string | null;
  powerUnits: number;
  drivers: number;
  crashesTwoYears: number;
  inspectionsTwoYears: number;
  outOfServiceRate: { vehicle: string; driver: string };
  basics: { label: string; percentile: number | null; alert: boolean }[];
  checkedAt: string;
};

export type ClearinghouseResult = {
  driverName: string;
  cdlNumber: string;
  cdlState: string;
  queryType: "limited" | "full";
  status: "not prohibited" | "prohibited" | "no consent on file" | "not registered";
  violations: number;
  queriedAt: string;
  /** When this query stops satisfying the annual requirement. */
  validThrough: string;
};

export type MvrPull = {
  driverId: string;
  state: string;
  pulledAt: string;
  validThrough: string;
  violations: string;
  status: "clean" | "violations on record" | "state unavailable";
};

export type FmcsaProvider = {
  /** Which implementation answered — shown plainly so nothing looks live when it is not. */
  readonly name: string;
  readonly live: boolean;
  authority(dot: string): Promise<FmcsaAuthority>;
  safety(dot: string): Promise<FmcsaSafety>;
  clearinghouse(input: {
    driverName: string;
    cdlNumber: string;
    cdlState: string;
    queryType: "limited" | "full";
  }): Promise<ClearinghouseResult>;
  mvr(input: { driverId: string; state: string }): Promise<MvrPull>;
};

/* ------------------------------------------------------------------ helpers */

function stamp(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Deterministic pseudo-random so the same DOT always answers the same way. */
function seedOf(s: string) {
  let n = 0;
  for (const ch of s) n = (n * 31 + ch.charCodeAt(0)) % 100_000;
  return n;
}

const carriers: Record<string, { legalName: string; mc: string }> = {
  "3992471": { legalName: "Vinson Bass Trucking LLC", mc: "MC-1188402" },
  "2210881": { legalName: "Sooner Freight Systems Inc", mc: "MC-889014" },
  "1440772": { legalName: "Red River Carriers LLC", mc: "MC-771220" },
};

/* --------------------------------------------------------------- mock impl */

export const mockFmcsa: FmcsaProvider = {
  name: "Mock FMCSA (no credentials configured)",
  live: false,

  async authority(dot) {
    const seed = seedOf(dot);
    const known = carriers[dot];
    return {
      dot,
      mc: known?.mc ?? `MC-${900000 + (seed % 90000)}`,
      legalName: known?.legalName ?? "Carrier on file",
      status: seed % 17 === 0 ? "inactive" : "active",
      authorityTypes: ["Common — property", "Contract — property"],
      commonAuthority: seed % 17 === 0 ? "none" : "active",
      insuranceOnFile: [
        {
          type: "Liability (BIPD)",
          amount: "$1,000,000",
          carrier: "Great West Casualty",
          effective: stamp(-320),
        },
        { type: "Cargo", amount: "$100,000", carrier: "Great West Casualty", effective: stamp(-320) },
      ],
      outOfServiceDate: null,
      checkedAt: stamp(),
    };
  },

  async safety(dot) {
    const seed = seedOf(dot);
    return {
      dot,
      rating: seed % 11 === 0 ? "conditional" : "satisfactory",
      ratingDate: stamp(-(400 + (seed % 300))),
      powerUnits: 1 + (seed % 40),
      drivers: 1 + (seed % 45),
      crashesTwoYears: seed % 3,
      inspectionsTwoYears: 4 + (seed % 20),
      outOfServiceRate: { vehicle: `${8 + (seed % 12)}%`, driver: `${1 + (seed % 5)}%` },
      basics: [
        { label: "Unsafe driving", percentile: 22 + (seed % 30), alert: false },
        { label: "Hours-of-service compliance", percentile: 18 + (seed % 40), alert: seed % 9 === 0 },
        { label: "Vehicle maintenance", percentile: 30 + (seed % 45), alert: false },
        { label: "Controlled substances", percentile: null, alert: false },
      ],
      checkedAt: stamp(),
    };
  },

  async clearinghouse({ driverName, cdlNumber, cdlState, queryType }) {
    const seed = seedOf(cdlNumber + cdlState);
    const prohibited = seed % 23 === 0;
    return {
      driverName,
      cdlNumber,
      cdlState,
      queryType,
      status: prohibited ? "prohibited" : "not prohibited",
      violations: prohibited ? 1 : 0,
      queriedAt: stamp(),
      validThrough: stamp(365),
    };
  },

  async mvr({ driverId, state }) {
    const seed = seedOf(driverId + state);
    return {
      driverId,
      state,
      pulledAt: stamp(),
      validThrough: stamp(365),
      violations: seed % 4 === 0 ? "1 — speeding, within 36 months" : "None in 36 months",
      status: seed % 4 === 0 ? "violations on record" : "clean",
    };
  },
};

/**
 * The seam. A live implementation reads its key from a server function — never
 * from browser code — and is swapped in here. Until then every answer is mock,
 * and the UI says so.
 */
export function fmcsaProvider(): FmcsaProvider {
  return mockFmcsa;
}
