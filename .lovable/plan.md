# Full-black theme and compact menu

## What will change
- Make pure black the canvas and surface foundation in every display mode, removing gray/light page and panel washes while keeping readable off-white text.
- Strengthen gold lighting on the orb, selected controls, borders, highlights, and important readouts; add deep/electric violet as a restrained secondary glow.
- Replace the full-screen three-dot menu with a compact anchored panel that has a capped viewport height and its own vertical scrolling, while preserving large touch targets and access to every section.

## Technical details
- Update the semantic theme tokens and shared panel/glass utilities so existing screens inherit the black/gold/violet treatment without page-by-page hardcoded colors.
- Keep Night, Gray, and Day preferences functional for brightness behavior, but all three will use the requested black visual foundation.
- Update the orb's ambient bloom and internal accents to blend violet at the gold fringe without changing its size, position, or liquid behavior.
- Update the menu overlay behavior, keyboard dismissal, and layout; verify desktop and mobile sizing, scrolling, and contrast in the live preview.
