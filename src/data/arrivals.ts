/**
 * INBOUND ARRIVALS — mock courier / technician records and speech helpers.
 *
 * A real integration replaces `pickCourier` with the courier record the
 * delivery service returns on its live-tracking webhook, and `pickTech` with
 * the dispatch record from the repair or towing provider.
 */

import type { ServiceId } from "@/data/delivery";

export type Courier = {
  name: string;
  vehicle: string;
  plate?: string;
};

/** Mock courier pool per service — real APIs return the assigned driver. */
export const courierPool: Record<ServiceId, Courier[]> = {
  ubereats: [
    { name: "Marcus", vehicle: "Grey Honda Civic", plate: "OK 4KT-118" },
    { name: "Dana", vehicle: "White Nissan Rogue", plate: "OK 8HR-402" },
  ],
  doordash: [
    { name: "Tasha", vehicle: "Red Ford Escape", plate: "TX 2LM-773" },
    { name: "Ruben", vehicle: "Black Chevy Malibu" },
  ],
  grubhub: [{ name: "Kevin", vehicle: "Silver Toyota Corolla", plate: "OK 6BC-905" }],
  instacart: [{ name: "Alina", vehicle: "Blue Kia Sorento — trunk load" }],
  gopuff: [{ name: "Jerome", vehicle: "GoPuff white Transit van" }],
  walmart: [{ name: "Carla", vehicle: "Grey Ford Fusion" }],
  walgreens: [{ name: "Beto", vehicle: "Tan Jeep Compass" }],
  cvs: [{ name: "Nia", vehicle: "White Hyundai Elantra" }],
  amazon: [{ name: "Amazon driver", vehicle: "Blue Rivian van" }],
};

export function pickCourier(service: ServiceId, seed = Date.now()): Courier {
  const pool = courierPool[service] ?? [{ name: "Your courier", vehicle: "Car" }];
  return pool[seed % pool.length]!;
}

/** Technician names paired with mock service companies. */
export const technicianNames = ["Ray", "Dwight", "Hector", "Junior", "Lamar", "Cody"];

export function pickTech(seed = Date.now()): string {
  return technicianNames[seed % technicianNames.length]!;
}

/** Spoken countdown thresholds, in minutes out. */
export const announceAt = [30, 15, 10, 5, 2, 0];

/**
 * Pull a quoted duration out of plain speech — "he said about an hour",
 * "ninety minutes", "45 min out", "an hour and a half".
 * Returns minutes, or null when nothing time-shaped was said.
 */
export function minutesFromSpeech(text: string): number | null {
  const t = text.toLowerCase();

  if (/hour and a half|90 ?min|ninety ?min/.test(t)) return 90;
  if (/half an hour|30 ?min|thirty ?min/.test(t)) return 30;

  const words: Record<string, number> = {
    ten: 10,
    fifteen: 15,
    twenty: 20,
    thirty: 30,
    forty: 40,
    "forty five": 45,
    fifty: 50,
    sixty: 60,
    ninety: 90,
  };
  for (const [w, n] of Object.entries(words)) {
    if (new RegExp(`${w}\\s*(minutes|minute|min)`).test(t)) return n;
  }

  const num = t.match(/(\d{1,3})\s*(minutes|minute|mins|min)\b/);
  if (num) return Math.max(1, Math.min(600, Number(num[1])));

  const hrs = t.match(/(\d{1,2})\s*(hours|hour|hr|hrs)\b/);
  if (hrs) return Math.max(5, Number(hrs[1]) * 60);

  if (/\b(an|one) hour\b/.test(t)) return 60;
  if (/\btwo hours\b/.test(t)) return 120;

  return null;
}
