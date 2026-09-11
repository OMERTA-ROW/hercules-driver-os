/**
 * THE VOICE CAST
 * ==============
 * Named personas out of the ZEUS / HERCULES mythology. HERCULES is the
 * principal voice and the default on every account. Each persona carries the
 * delivery direction HERCULES speaks with — tone, pace, personality — so the
 * character is real in the audio, not just a label in a list.
 *
 * `tts` is the underlying premium voice; `direction` steers it toward smooth,
 * expressive, human conversation rather than flat read-aloud. Every persona
 * keeps the identical full-conversation behaviour.
 */

export type VoiceId =
  | "hercules"
  | "zeus"
  | "ares"
  | "atlas"
  | "apollo"
  | "athena"
  | "medusa"
  | "hera"
  | "artemis";

export type VoiceOption = {
  id: VoiceId;
  name: string;
  gender: "male" | "female";
  /** Short character descriptor shown in the picker. */
  hint: string;
  /** Underlying premium voice. */
  tts: string;
  /** Natural-language delivery steering — this is what makes it a character. */
  direction: string;
  /** Speaking rate, 0.25–4.0. */
  speed: number;
  /** Spoken in the picker preview. */
  sample: string;
  principal?: boolean;
};

const conversational =
  "Speak like a real person talking to a truck driver over the cab speakers, not like a narrator reading text. Warm, natural, expressive, unhurried breathing, easy contractions. Never robotic or clipped.";

export const voiceOptions: VoiceOption[] = [
  {
    id: "hercules",
    name: "Hercules",
    gender: "male",
    hint: "Deep, strong and commanding — warm, never cold. The principal voice.",
    tts: "onyx",
    direction: `${conversational} Deep chest voice, strong and commanding but genuinely warm — a big man who has your back and takes his time.`,
    speed: 0.95,
    sample:
      "I'm Hercules. I'll ride with you the whole way — and nothing gets booked until you say so.",
    principal: true,
  },
  {
    id: "zeus",
    name: "Zeus",
    gender: "male",
    hint: "Authoritative and measured — weight behind every word.",
    tts: "ash",
    direction: `${conversational} Older, authoritative, measured. Deliberate pauses, absolute certainty, no hurry. Commanding without shouting.`,
    speed: 0.92,
    sample: "Zeus here. Give me the road and I'll tell you exactly what's coming.",
  },
  {
    id: "ares",
    name: "Ares",
    gender: "male",
    hint: "Blunt and hard-edged — short, fast, straight to it.",
    tts: "echo",
    direction: `${conversational} Blunt, hard-edged, no softening. Short punchy phrasing, quick and slightly gravelly. Direct, but still human.`,
    speed: 1.08,
    sample: "Ares. No padding, no speeches. You ask, I answer straight.",
  },
  {
    id: "atlas",
    name: "Atlas",
    gender: "male",
    hint: "Slow, steady and heavy — calm on a bad night.",
    tts: "verse",
    direction: `${conversational} Slow, steady, heavy and grounded. Long even cadence, unshakeable calm — the voice you want at three in the morning.`,
    speed: 0.85,
    sample: "Atlas. Take it easy. I'll keep everything steady while you drive.",
  },
  {
    id: "apollo",
    name: "Apollo",
    gender: "male",
    hint: "Bright and easygoing — light, friendly company.",
    tts: "fable",
    direction: `${conversational} Bright, easygoing, friendly and a little playful. Light lift at the end of phrases, sunny company on a long haul.`,
    speed: 1.03,
    sample: "Apollo, riding shotgun. Long day? Talk to me, I'll keep it light.",
  },
  {
    id: "athena",
    name: "Athena",
    gender: "female",
    hint: "Calm and precise — clear, exact, unflustered.",
    tts: "sage",
    direction: `${conversational} Calm, precise, intelligent. Clean articulation, exact numbers, never flustered. Warm underneath the precision.`,
    speed: 0.98,
    sample: "Athena. I'll give you the numbers exactly as they are, every time.",
  },
  {
    id: "medusa",
    name: "Medusa",
    gender: "female",
    hint: "Low, smooth and hypnotic — slow burn, night runs.",
    tts: "coral",
    direction: `${conversational} Low, smooth, hypnotic. Slow sultry cadence, breathy warmth, long unhurried lines. Never sharp, never bright.`,
    speed: 0.86,
    sample: "Medusa. Stay with me… I'll talk you all the way through the dark.",
  },
  {
    id: "hera",
    name: "Hera",
    gender: "female",
    hint: "Regal and composed — poised, quietly in charge.",
    tts: "shimmer",
    direction: `${conversational} Regal, composed, quietly in command. Poised phrasing, gracious warmth, complete authority without raising her voice.`,
    speed: 0.95,
    sample: "Hera. Everything is in order — and it stays that way until you decide otherwise.",
  },
  {
    id: "artemis",
    name: "Artemis",
    gender: "female",
    hint: "Quick and alert — sharp, energetic, always ahead of you.",
    tts: "nova",
    direction: `${conversational} Quick, alert, energetic. Crisp forward momentum, sharp eyes on the road ahead, friendly and a little wry.`,
    speed: 1.06,
    sample: "Artemis. Eyes up ahead — I'll call it out before you get to it.",
  },
];

export function voiceById(id: VoiceId) {
  return voiceOptions.find((v) => v.id === id) ?? voiceOptions[0]!;
}

export const maleVoices = voiceOptions.filter((v) => v.gender === "male");
export const femaleVoices = voiceOptions.filter((v) => v.gender === "female");
