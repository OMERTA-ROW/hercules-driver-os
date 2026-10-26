# Hercules add-on UI audit — October 26, 2026

## Named changes
- `0f97659` — **Added demo add-ons to HERCULES**: only plan and roadmap changes. No add-on screens were created by this commit.
- `7241a5d` — **Queued vehicle profile add-ons**: profile persistence migration, conversion/validation, equipment form and account-saving groundwork. Not a complete live routing integration.
- `a9d50e5` — **Queued remaining trucking features**: roadmap-only queue/status update.

## Current audited status
Partial: shared vehicle profile, existing conversational voice, account documents/review. Demo: truck routing/rerouting, corridor hazards, stop/parking previews, ECU screens. Planned: offline trip bundle, driver alert network, actual service-fee ledger. None of the ten full requested add-ons is verified complete.

## Preview changes
- Existing `/dashboard` now displays an audited ten-item directory, including signed-out visitors, above existing account records.
- Home links to the dashboard; existing menu includes Add-on Status; workspace rail includes Vehicle Profile. Links retain existing destination role checks. No subscriptions are enabled by the directory.
- Fixed black canvas, warm-white text, gold navigation/header accents and purple Demo edges. Existing chat, original voice orb, operational data and approvals remain in place. The old decorative fixed sphere is suppressed only in the workspace to prevent content overlap; voice orb is untouched.
- Added missing social metadata on five existing content pages and refreshed dashboard metadata.
- Patched the flagged DOMPurify dependency via a 3.4.17 override and regenerated lockfile. The reported advisory is absent from the new dependency scan; that scan reports other dependency advisories, so this is not a clean-security claim.

## Verification and limitations
- Desktop 1280×1800 and phone 390×844: home → dashboard → profile destination; ten cards, accurate status counts, true black computed background, no horizontal overflow or page runtime errors. Scrolled to final Planned entry on both sizes.
- Chat opens, minimizes, reopens and collapses with Escape on both sizes. Existing unsent composer text is cleared on minimize; conversation retention is covered by existing tests, not a new persistence claim.
- 62 focused tests passed: directory status rules, vehicle conversion/validation, chat, voice cancellation, theme and BOL intents. Existing chat tests emit React act warnings.
- Automatic preview builds passed. No manual build or typecheck was run; the platform performs those checks.
- Authenticated end-to-end checks could not run: session minting reports no auth users. No test account was created; no live AI/voice or paid provider calls were made.
- Published custom-domain home was inspected and still lacks this new directory. No production publication occurred. Provider credentials/consent, hardware, live hazard/HOS/parking and automatic compliance work remain pending.