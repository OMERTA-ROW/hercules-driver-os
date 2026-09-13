/**
 * FREE DEVICE VOICE — the honest fallback.
 *
 * When premium speech can't be used (not signed in, no credits, provider
 * unreachable, Eco quality on) the line is still spoken, by the device itself,
 * at zero credit cost. The device's own voice list is whatever the browser and
 * operating system provide, so this picks the closest match to the chosen
 * persona's gender instead of pretending the persona itself is available.
 *
 * Pure and dependency-free so it can be tested without a browser.
 */

export type DeviceVoiceLike = {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
};

/** Names commonly used by the platforms for each gender. */
const FEMALE_HINTS = [
  "female",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "zira",
  "susan",
  "allison",
  "joanna",
  "ava",
  "serena",
  "google uk english female",
  "google us english",
];

const MALE_HINTS = [
  "male",
  "daniel",
  "alex",
  "fred",
  "david",
  "george",
  "james",
  "oliver",
  "aaron",
  "tom",
  "rishi",
  "google uk english male",
];

function scoreFor(voice: DeviceVoiceLike, gender: "male" | "female") {
  const name = voice.name.toLowerCase();
  const wanted = gender === "female" ? FEMALE_HINTS : MALE_HINTS;
  const other = gender === "female" ? MALE_HINTS : FEMALE_HINTS;

  let score = 0;
  if (wanted.some((h) => name.includes(h))) score += 40;
  if (other.some((h) => name.includes(h))) score -= 40;
  if (voice.lang?.toLowerCase().startsWith("en")) score += 12;
  // Locally installed voices don't need the network and sound the same offline.
  if (voice.localService) score += 4;
  if (voice.default) score += 2;
  return score;
}

/**
 * Best available device voice for a persona's gender, or `null` when the device
 * exposes no voices at all — in which case the caller must not claim a voice.
 */
export function pickDeviceVoice<T extends DeviceVoiceLike>(
  voices: readonly T[],
  gender: "male" | "female",
): T | null {
  if (!voices || voices.length === 0) return null;
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  let best = pool[0]!;
  let bestScore = scoreFor(best, gender);
  for (const v of pool.slice(1)) {
    const s = scoreFor(v, gender);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

/** True when this device can distinguish a male from a female voice at all. */
export function deviceHasBothGenders(voices: readonly DeviceVoiceLike[]) {
  const male = pickDeviceVoice(voices, "male");
  const female = pickDeviceVoice(voices, "female");
  return !!male && !!female && male.name !== female.name;
}

/**
 * Natural-sounding delivery for the device voice: a slightly relaxed rate and
 * neutral pitch. No pitch tricks — a raised or lowered pitch is what makes a
 * synthetic voice sound robotic rather than human.
 */
export function deviceDelivery(speed: number) {
  return { rate: Math.max(0.7, Math.min(1.25, speed)), pitch: 1 };
}
