# HERCULES Matte Colorway Overhaul

## Goal
Transform the existing cockpit into a cohesive futuristic matte system without changing navigation, workflows, data behavior, approvals, voice behavior, or page layouts.

## Visual direction
- Replace chrome, sheen, glassy reflection, and metallic highlights with soft matte surfaces and velvety depth.
- Preserve dimensional shadows and colored glow, but keep light behind or around surfaces rather than reflected across them.
- Keep the orb’s exact silhouette deformation, voice response, pulse timing, touch response, and scale; replace its chrome bands, specular spots, and caustics with softly layered matte shading.
- Make all controls fully rounded: circular icon controls, pill buttons, rounded bubble selectors, switches, fields, menus, and navigation.
- Retain semi-transparency and blur where supported, with solid matte fallbacks for reduced transparency and unsupported browsers.

## Five complete colorways
Create a single app-wide colorway selector in Settings. Each choice updates the page, panels, controls, orb, trim, focus rings, map chrome, voice controls, and glow together.

1. **Matte Black** — near-black ground, charcoal surfaces, warm gold trim and glow; default.
2. **Matte Pink** — deep muted rose ground, dusty pink surfaces, cool cyan-white trim and glow for a sleek contrast.
3. **Matte Grey** — graphite ground, neutral grey surfaces, clean white/silver trim and glow.
4. **Matte Gold** — muted antique-gold ground, dense ochre surfaces, deep black trim and shadow-like glow.
5. **Matte Turquoise** — deep teal ground, matte turquoise surfaces, restrained coral-white trim and glow.

The existing Night / Gray / Day display choice remains an exposure and brightness control. It will tune contrast within the selected colorway rather than replace that colorway. Existing saved black/grey/white orb preferences will migrate safely to the closest new app-wide option.

## Implementation

### 1. Theme and persistence
- Extend the theme state with the five colorways and apply the selected value to the document root.
- Store the selection locally and restore it after hydration without causing a flash or mismatch.
- Keep the existing brightness override and automatic night behavior intact.
- Preserve the current voice context API where needed, while making the orb consume the same app-wide colorway as every other surface.

### 2. Semantic matte design system
- Rebuild global semantic tokens as a colorway-plus-exposure matrix for backgrounds, raised surfaces, text, muted text, trim, glow, controls, orb layers, status colors, and map treatment.
- Remove specular inset highlights, glossy gradients, chrome language, and reflective saturation.
- Replace panel, card, dropdown, bubble bar, bubble card, and nested surface styles with translucent matte fills, soft diffuse shadows, and colorway-specific glow.
- Keep accessibility roles and status colors distinct from decorative colorways.

### 3. Matte orb
- Keep the current animation loop, audio response, displacement, touch dents, and pulse behavior unchanged.
- Replace metallic banding, moving highlights, glossy overlays, and bright meniscus effects with broad low-contrast matte tonal fields and diffuse edge shading.
- Drive body, rim, and halo colors from the active colorway, including the requested black glow for Matte Gold.
- Update comments and labels so the implementation no longer describes the orb as chrome or mercury-finished.

### 4. Round bubble controls everywhere
- Update the shared button and tab primitives so future controls inherit pill/circle geometry and matte glow automatically.
- Update shared navigation rail, phone dock, three-dot control, dropdown entries, voice dock, brightness control, confirmations, toggles, inputs, selects, and local segmented controls.
- Sweep remaining route-local raw controls and rectangular interactive tiles, converting them to the shared bubble treatment without changing handlers or state.
- Add subtle lift/settle and section-transition motion, with no layout shift and full reduced-motion support.

### 5. Settings selector
- Replace the existing orb-only picker with five app-wide colorway previews.
- Show each option using its real matte surface, trim, text, glow, and orb treatment so the preview reflects the complete theme.
- Keep the existing display and brightness controls as separate settings.

### 6. Responsive and accessibility verification
- Check the home orb, Settings, Voice, Equipment, Company, Dashboard, maps, menus, forms, and confirmation flows.
- Verify phone, tablet, and desktop sizes; ensure floating navigation never covers calls to action or voice controls.
- Confirm 44px minimum targets, keyboard focus, selected semantics, readable contrast, horizontal overflow behavior, safe-area spacing, reduced motion, and reduced-transparency fallback.
- Run focused tests, the full test suite, type checks, and the production verification performed by the project harness.

## Scope guardrails
- No business logic, account rules, billing behavior, voice provider behavior, maps data, database rules, or page structure changes.
- No mock operational data, purchases, publishing, or charges.
- The previously outstanding authenticated company load/equipment rollback assertions remain separate and are not represented as completed by this visual pass.
