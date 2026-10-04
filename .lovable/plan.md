# HERCULES Shapher Theme

## Scope
Restyle only the existing original HERCULES app. Preserve every route, workflow, permission, integration, voice/BOL behavior, and data path. Make no database, schema, provider, or publishing changes.

## Route inventory
Existing requested pages:
- Login: `/sign-in`
- Dashboard: `/dashboard`
- Dispatch: `/dispatch`
- Loads: `/loads`
- Driver: `/driver`
- Broker: `/broker`
- Settings: `/settings`

Requested names that do not exist as routes:
- Shipper
- Messages
- Integrations
- Admin

No substitute or placeholder routes will be created. Live checks will report any role/session-gated page that cannot be exercised.

## Implementation
1. Replace all legacy selectable themes with one fixed Shapher appearance based on `#2D2B29`.
2. Define an accessible warm-white foreground and same-hue surface steps limited to roughly 3–4% lighter or darker than the base.
3. Remove gold and chromatic accents, gradients, glass, blur, glow, metallic effects, grids, and decorative background artwork from shared styling and route-local exceptions.
4. Add a seamless local procedural rocky grain at about 3% opacity on empty page areas only. Keep it behind content, non-interactive, and out of print.
5. Add restrained surface drift/ripple only to empty areas, with 600ms fades. Disable it for reduced motion and when Surface Motion is off.
6. Replace the old appearance and motion choices with one accessible `Settings > Appearance > Surface Motion` switch, persisted locally. System reduced-motion always overrides it, with clear explanatory text.
7. Keep the speaking indicator tied to actual audio, recolored into the Shapher palette and disabled by either motion override.
8. Migrate legacy stored appearance values to Shapher once so old colors cannot return after reload or account synchronization.
9. Keep printed BOL output strictly white paper with black text and no grain or animation.

## Technical details
- Consolidate semantic tokens in `src/styles.css`; route code continues using existing semantic classes.
- Remove the global colorway selector from shared headers and standalone authentication pages.
- Update theme/voice preference code without changing server contracts or voice lifecycle behavior.
- Audit hardcoded route styling and inline SVG/map treatment for chromatic or black-surface exceptions.
- Update visual regression tests for the single theme, contrast, migration, motion persistence, reduced-motion override, and speaking-only ripple.
- Update project architecture notes and the active roadmap to replace the superseded three-theme rule.

## Verification
- Capture desktop and mobile screenshots for every reachable requested route, including open chat and Settings.
- Check computed page/surface colors, grain placement, text contrast, motion on/off persistence, live reduced-motion changes, keyboard focus, and click-through behavior.
- Verify Login directly; verify other requested pages with an authenticated session when available, otherwise report them as blocked rather than claiming coverage.
- Run focused tests, the full test suite, TypeScript checks, and the production build.
- Do not trigger metered voice, email, printing, external APIs, purchases, or publication.
