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
  "hercules" | "zeus" | "ares" | "atlas" | "apollo" | "athena" | "medusa" | "hera" | "artemis";

/**
 * LIVE SPEECH PROVIDER — ElevenLabs, called server-side only.
 * `eleven_multilingual_v2` is ElevenLabs' most natural, human-sounding stable
 * model on the text-to-speech endpoint. It replaced the low-latency
 * `eleven_flash_v2_5`, which sounded flatter and more synthetic.
 */
export const ELEVEN_MODEL = "eleven_multilingual_v2";

/**
 * Bump whenever the model, a voice or any delivery setting changes. It is part
 * of every audio cache key and every preview clip URL, so nobody keeps hearing
 * audio rendered with old settings.
 */
export const VOICE_SETTINGS_VERSION = "natural-2026-09-v1";

/**
 * The model that rendered the static preview clips in /public/voice-samples.
 * They are now rendered by the SAME ElevenLabs voice and model used live, via
 * scripts/build-voice-samples.ts, so the picker previews the real character.
 */
export const PREVIEW_CLIP_MODEL = ELEVEN_MODEL;

/** Legacy alias kept so older callers and tests keep naming the preview clips. */
export const TTS_MODEL = PREVIEW_CLIP_MODEL;

/**
 * Voice names the preview-clip model served. Retained only so the shipped
 * sample clips stay documented; live speech uses the `eleven` ids below.
 */
export const supportedTtsVoices = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
] as const;

export type SupportedTtsVoice = (typeof supportedTtsVoices)[number];

export type VoiceOption = {
  id: VoiceId;
  name: string;
  gender: "male" | "female";
  /** Short character descriptor shown in the picker. */
  hint: string;
  /** Voice used for the shipped preview clip (preview-clip model). */
  tts: SupportedTtsVoice;
  /** Licensed ElevenLabs stock voice id used for live speech. */
  eleven: string;
  /** That stock voice's published name, for the status screen. */
  elevenName: string;
  /** Natural-language delivery steering — this is what makes it a character. */
  direction: string;
  /** Speaking rate, 0.7–1.2 at the provider. */
  speed: number;
  /** ElevenLabs stability: lower is more expressive, higher more consistent. */
  stability: number;
  /** ElevenLabs style exaggeration. */
  style: number;
  /** Spoken in the picker preview. */
  sample: string;
  principal?: boolean;
};


const conversational =
  "Talk like a real person in the cab, not a narrator reading text. Warm, relaxed, everyday conversational pace, easy contractions. Never robotic, never theatrical.";

export const voiceOptions: VoiceOption[] = [
  {
    id: "hercules",
    name: "Hercules",
    gender: "male",
    hint: "Deep, strong and commanding — warm, never cold. The principal voice.",
    tts: "onyx",
    eleven: "JBFqnCBsd6RMkjVDRZzb",
    elevenName: "George",
    stability: 0.5,
    style: 0.2,
    direction: `${conversational} Deep, steady and warm — a big, easygoing guy who has your back.`,
    speed: 1.0,
    sample: "Hey, I'm Hercules. I'll ride along with you, and nothing gets booked till you say so.",
    principal: true,
  },
  {
    id: "zeus",
    name: "Zeus",
    gender: "male",
    hint: "Authoritative and measured — weight behind every word.",
    tts: "ash",
    eleven: "pqHfZKP75CvOlQylNhV4",
    elevenName: "Bill",
    stability: 0.55,
    style: 0.15,
    direction: `${conversational} Older and assured. Calm, confident, plain-spoken — never preachy.`,
    speed: 0.98,
    sample: "Zeus here. Tell me where you're headed and I'll let you know what's coming up.",
  },
  {
    id: "ares",
    name: "Ares",
    gender: "male",
    hint: "Blunt and hard-edged — short, fast, straight to it.",
    tts: "echo",
    eleven: "N2lVS1w4EtoT3dr4eOWO",
    elevenName: "Callum",
    stability: 0.45,
    style: 0.25,
    direction: `${conversational} Direct and to the point, a little gravelly, but still friendly.`,
    speed: 1.04,
    sample: "Ares. Straight answers, no fluff. What do you need?",
  },
  {
    id: "atlas",
    name: "Atlas",
    gender: "male",
    hint: "Slow, steady and heavy — calm on a bad night.",
    tts: "verse",
    eleven: "onwK4e9ZLuTAKqWW03F9",
    elevenName: "Daniel",
    stability: 0.55,
    style: 0.15,
    direction: `${conversational} Calm, grounded and reassuring — the voice you want at three in the morning.`,
    speed: 0.97,
    sample: "Atlas here. Take it easy — I'll keep an eye on things while you drive.",
  },
  {
    id: "apollo",
    name: "Apollo",
    gender: "male",
    hint: "Bright and easygoing — light, friendly company.",
    tts: "fable",
    eleven: "TX3LPaxmHKxFdv7VOQHJ",
    elevenName: "Liam",
    stability: 0.45,
    style: 0.25,
    direction: `${conversational} Bright, friendly and easygoing, like good company on a long haul.`,
    speed: 1.02,
    sample: "Apollo, riding shotgun. Long day? Talk to me, we'll keep it easy.",
  },
  {
    id: "athena",
    name: "Athena",
    gender: "female",
    hint: "Calm and precise — clear, exact, unflustered.",
    tts: "sage",
    eleven: "EXAVITQu4vr4xnSDxMaL",
    elevenName: "Sarah",
    stability: 0.55,
    style: 0.15,
    direction: `${conversational} Clear, calm and precise, with real warmth underneath.`,
    speed: 1.0,
    sample: "Hi, I'm Athena. I'll give you the numbers straight, every time.",
  },
  {
    id: "medusa",
    name: "Medusa",
    gender: "female",
    hint: "Low, smooth and hypnotic — slow burn, night runs.",
    tts: "coral",
    eleven: "XrExE9yKIg1WjnnlVkGX",
    elevenName: "Matilda",
    stability: 0.5,
    style: 0.25,
    direction: `${conversational} Low, smooth and relaxed — soft warmth for night runs, never breathy or theatrical.`,
    speed: 0.97,
    sample: "Hey, it's Medusa. Late run? I'll keep you company the whole way.",
  },
  {
    id: "hera",
    name: "Hera",
    gender: "female",
    hint: "Regal and composed — poised, quietly in charge.",
    tts: "shimmer",
    eleven: "Xb7hH8MSUJpSbSDYk0k2",
    elevenName: "Alice",
    stability: 0.55,
    style: 0.2,
    direction: `${conversational} Composed and gracious, quietly confident.`,
    speed: 0.99,
    sample: "Hera here. Everything's in order, and it stays that way till you decide otherwise.",
  },
  {
    id: "artemis",
    name: "Artemis",
    gender: "female",
    hint: "Quick and alert — sharp, energetic, always ahead of you.",
    tts: "nova",
    eleven: "pFZP5JQG7iQjIQuC4Bku",
    elevenName: "Lily",
    stability: 0.45,
    style: 0.25,
    direction: `${conversational} Quick, alert and friendly, a little wry.`,
    speed: 1.03,
    sample: "Artemis here. I'll call things out before you get to them.",
  },
];

export function voiceById(id: VoiceId) {
  return voiceOptions.find((v) => v.id === id) ?? voiceOptions[0]!;
}

export const maleVoices = voiceOptions.filter((v) => v.gender === "male");
export const femaleVoices = voiceOptions.filter((v) => v.gender === "female");
