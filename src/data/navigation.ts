export const navSteps = [
  { in: "0.4 mi", text: "Merge right onto I-44 E", lane: "Keep right, 2 lanes" },
  { in: "38 mi", text: "Exit 122 toward US-75 S", lane: "Right exit" },
  { in: "104 mi", text: "Continue on I-44 E toward Tulsa", lane: "Center lanes" },
  { in: "214 mi", text: "Arrive: Dock 14, Oklahoma City OK", lane: "Gate on the left" },
] as const;

/** Ghosted route polyline drawn under the orb (viewBox 0 0 400 400). */
export const routePath =
  "M 24 372 C 96 332 74 286 128 258 C 190 226 152 176 206 146 C 260 116 232 74 306 44 L 372 22";
