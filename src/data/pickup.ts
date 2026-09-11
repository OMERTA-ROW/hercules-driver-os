/**
 * PART PICKUP SITES — mock supplier-site data.
 *
 * When a driver orders a part for pickup rather than delivery, HERCULES needs
 * more than a price: it needs the actual site. Where the counter is, whether a
 * 70-foot unit can get in and out, when they close, and whether the part is on
 * the shelf now or later.
 *
 * Shaped like a supplier location/inventory API response (dealer DMS, FleetPride
 * branch feed) so a live one drops in behind `src/lib/pickup.tsx` untouched.
 * Coordinates are resolved onto the live route corridor, so the site lands on
 * the Google Maps layer at a real position — never a floating placeholder.
 */

import { primaryRoute, type LatLng } from "@/data/routing";
import { supplierById, type Listing } from "@/data/parts";

/* ------------------------------------------------------------- SITE TEMPLATES */

export type SiteTemplate = {
  /** Posted counter hours, plain language. */
  hours: string;
  /** Local closing time in 24h minutes-from-midnight, for the "will you make it" check. */
  closesAtMin: number;
  open24: boolean;
  /** Where the driver physically collects it. */
  counter: string;
  /** Truck parking at that site — the thing nobody else tells you. */
  parking: string;
  phone: string;
};

const siteTemplates: Record<string, SiteTemplate> = {
  rush: {
    hours: "Parts counter 6:00 a.m. – 11:00 p.m., Mon–Sat",
    closesAtMin: 23 * 60,
    open24: false,
    counter: "Will-call window, right side of the parts building",
    parking: "Paved tractor-trailer lot, pull-through — you can stay hooked",
    phone: "(405) 555-0142",
  },
  freightliner: {
    hours: "Parts counter 7:00 a.m. – 9:00 p.m., Mon–Fri · 8–4 Sat",
    closesAtMin: 21 * 60,
    open24: false,
    counter: "Parts desk inside the service drive, ask for will-call",
    parking: "Drop yard behind the bays, tight turn off the service drive",
    phone: "(405) 555-0197",
  },
  international: {
    hours: "Parts counter 6:00 a.m. – 10:00 p.m., Mon–Sat",
    closesAtMin: 22 * 60,
    open24: false,
    counter: "Will-call rack at the north parts door",
    parking: "Gravel lot, room for a 53 if you swing wide at the gate",
    phone: "(405) 555-0163",
  },
  peterbilt: {
    hours: "Parts counter 7:00 a.m. – 7:00 p.m., Mon–Fri",
    closesAtMin: 19 * 60,
    open24: false,
    counter: "Parts counter, will-call shelf under your name",
    parking: "Paved lot in front of the bays, back-in only",
    phone: "(405) 555-0118",
  },
  kenworth: {
    hours: "Parts counter 7:00 a.m. – 8:00 p.m., Mon–Sat",
    closesAtMin: 20 * 60,
    open24: false,
    counter: "Will-call desk, left of the main parts entrance",
    parking: "Pull-through lane alongside the parts building",
    phone: "(405) 555-0125",
  },
  volvo: {
    hours: "Parts counter 7:00 a.m. – 8:00 p.m., Mon–Fri",
    closesAtMin: 20 * 60,
    open24: false,
    counter: "Parts will-call, second door past the service write-up",
    parking: "Paved yard, plenty of room to turn a 70-footer",
    phone: "(405) 555-0177",
  },
  mack: {
    hours: "Parts counter 7:00 a.m. – 7:00 p.m., Mon–Fri",
    closesAtMin: 19 * 60,
    open24: false,
    counter: "Will-call counter inside the parts showroom",
    parking: "Side lot, back-in — do not block the wash bay",
    phone: "(405) 555-0134",
  },
  fleetpride: {
    hours: "Branch counter 7:00 a.m. – 6:00 p.m., Mon–Fri · 8–12 Sat",
    closesAtMin: 18 * 60,
    open24: false,
    counter: "Front counter, they'll carry it out to you",
    parking: "Wide gravel apron off the frontage road, stay on the shoulder side",
    phone: "(405) 555-0151",
  },
  truckpro: {
    hours: "Branch counter 7:00 a.m. – 6:00 p.m., Mon–Fri",
    closesAtMin: 18 * 60,
    open24: false,
    counter: "Counter pickup, will-call bin behind the register",
    parking: "Street-side pull-off, no yard — plan a short stop",
    phone: "(405) 555-0186",
  },
  napahd: {
    hours: "Counter 7:30 a.m. – 6:00 p.m., Mon–Sat",
    closesAtMin: 18 * 60,
    open24: false,
    counter: "Heavy-duty counter at the back of the store",
    parking: "No truck lot — park on the shoulder or the lot next door",
    phone: "(405) 555-0109",
  },
  amazon: {
    hours: "Locker access 24 hours",
    closesAtMin: 24 * 60,
    open24: true,
    counter: "Parcel locker — your code is on the order",
    parking: "Whatever the host site allows; usually car-only",
    phone: "(888) 555-0100",
  },
  "loves-tire": {
    hours: "Truck Care open 24 hours",
    closesAtMin: 24 * 60,
    open24: true,
    counter: "Truck Care counter, separate door from the store",
    parking: "Truck lot with reserved spaces, showers on site",
    phone: "(405) 555-0170",
  },
  "ta-petro": {
    hours: "RoadSquad and service bays open 24 hours",
    closesAtMin: 24 * 60,
    open24: true,
    counter: "Service desk in the truck service building",
    parking: "Large truck lot, easy in and out at both ends",
    phone: "(405) 555-0155",
  },
  pilot: {
    hours: "Store open 24 hours",
    closesAtMin: 24 * 60,
    open24: true,
    counter: "Fuel desk — tell them your name and order",
    parking: "Truck lot, showers and laundry on site",
    phone: "(405) 555-0166",
  },
  permitco: {
    hours: "Permit desk 8:00 a.m. – 6:00 p.m., Mon–Fri",
    closesAtMin: 18 * 60,
    open24: false,
    counter: "Emailed and faxed — nothing to collect in person",
    parking: "No visit needed",
    phone: "(800) 555-0140",
  },
};

const fallbackTemplate: SiteTemplate = {
  hours: "Counter 8:00 a.m. – 5:00 p.m., Mon–Fri",
  closesAtMin: 17 * 60,
  open24: false,
  counter: "Front counter pickup",
  parking: "Confirm truck access when you call ahead",
  phone: "(800) 555-0000",
};

/* --------------------------------------------------------------- COORDINATES */

/** Cumulative mileage of the live corridor, so a site lands at a real point. */
function corridorMiles(): { cum: number[]; total: number } {
  const pts = primaryRoute.polyline;
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = (b.lng - a.lng) * 57.3;
    const dy = (b.lat - a.lat) * 69.0;
    cum.push(cum[i - 1]! + Math.hypot(dx, dy));
  }
  return { cum, total: cum[cum.length - 1]! };
}

/** Position `milesAhead` up the corridor, offset by the detour off the mainline. */
export function pointAlongRoute(milesAhead: number, milesOffRoute = 0): LatLng {
  const pts = primaryRoute.polyline;
  const { cum, total } = corridorMiles();
  const target = Math.max(0, Math.min(milesAhead, total));
  let i = 1;
  while (i < cum.length - 1 && cum[i]! < target) i += 1;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const span = Math.max(0.001, cum[i]! - cum[i - 1]!);
  const t = Math.max(0, Math.min(1, (target - cum[i - 1]!) / span));
  const lat = a.lat + (b.lat - a.lat) * t;
  const lng = a.lng + (b.lng - a.lng) * t;
  // Detour pushes the site off the mainline, east or west of the corridor.
  const side = milesAhead % 2 === 0 ? 1 : -1;
  return { lat, lng: lng + (side * milesOffRoute) / 57.3 };
}

/* ---------------------------------------------------------------- PICKUP SITE */

export type PickupSite = {
  supplierId: string;
  name: string;
  /** Real coordinates on the route corridor for the map layer. */
  at: LatLng;
  hours: string;
  open24: boolean;
  closesAtMin: number;
  counter: string;
  parking: string;
  phone: string;
  milesAhead: number;
  milesOffRoute: number;
};

export function pickupSiteFor(listing: Listing): PickupSite {
  const t = siteTemplates[listing.supplierId] ?? fallbackTemplate;
  return {
    supplierId: listing.supplierId,
    name: listing.location,
    at: pointAlongRoute(listing.milesAhead, listing.milesOffRoute),
    hours: t.hours,
    open24: t.open24,
    closesAtMin: t.closesAtMin,
    counter: t.counter,
    parking: t.parking,
    phone: t.phone,
    milesAhead: listing.milesAhead,
    milesOffRoute: listing.milesOffRoute,
  };
}

/* ------------------------------------------------------------------ READINESS */

export type Readiness = {
  /** True when the part is on the shelf and the driver can roll straight there. */
  readyNow: boolean;
  /** Minutes until it is ready, 0 when it is ready now. */
  inMinutes: number;
  /** Plain-language readiness, as the counter would put it. */
  text: string;
};

/**
 * The counter's own wording plus the shelf count is enough to know whether the
 * route goes out now or gets held. A live inventory API replaces this with a
 * promised-ready timestamp.
 */
export function readinessFor(listing: Listing): Readiness {
  const said = listing.ready.toLowerCase();
  if (listing.inStock > 0 || said.includes("shelf") || said.includes("hold")) {
    return { readyNow: true, inMinutes: 0, text: listing.ready };
  }
  if (said.includes("tomorrow") || said.includes("next day") || said.includes("overnight")) {
    return { readyNow: false, inMinutes: 14 * 60, text: listing.ready };
  }
  if (said.includes("morning")) return { readyNow: false, inMinutes: 10 * 60, text: listing.ready };
  const hrs = /(\d+)\s*hour/.exec(said);
  if (hrs) return { readyNow: false, inMinutes: Number(hrs[1]) * 60, text: listing.ready };
  const mins = /(\d+)\s*minute/.exec(said);
  if (mins) return { readyNow: true, inMinutes: 0, text: listing.ready };
  return { readyNow: false, inMinutes: 3 * 60, text: listing.ready };
}

/* ------------------------------------------------------------------- DRIVE ETA */

/** Loaded truck average, plus the detour off the mainline both ways in. */
export function driveMinutesTo(site: { milesAhead: number; milesOffRoute: number }) {
  const mainline = (site.milesAhead / 54) * 60;
  const detour = (site.milesOffRoute / 30) * 60;
  return Math.max(3, Math.round(mainline + detour));
}

export function spokenSite(site: PickupSite) {
  return `${site.name}, ${site.milesAhead} miles ahead and ${site.milesOffRoute.toFixed(
    1,
  )} off the mainline. ${site.counter}. ${site.parking}. ${site.hours}.`;
}

export function willMakeCounter(site: PickupSite, minutesOut: number, now = new Date()) {
  if (site.open24) return true;
  const arriveMin = now.getHours() * 60 + now.getMinutes() + minutesOut;
  return arriveMin <= site.closesAtMin;
}

export function supplierName(supplierId: string) {
  try {
    return supplierById(supplierId).name;
  } catch {
    return supplierId;
  }
}
