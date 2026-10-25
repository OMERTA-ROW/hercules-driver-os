# HERCULES add-ons: Vehicle Profile, then truck routing

## Scope and sequence
Queue all ten requested add-ons in the roadmap, separately from paused work. Start only with **2 (Vehicle Profile)** and **1 (truck routing)** after current chat work; do not resume historical unchecked tasks implicitly. Preserve the existing theme, liquid-metal orb, single voice-first conversation interface and approval safeguards. No publication or billing changes.

## First: one real vehicle profile
- Reuse existing account-owned equipment and active-trip selection, not a second profile system.
- Include type, height, gross weight, length, axles, trailer type and hazmat (retain width for routing).
- Save and reload real trailer/hazmat values; the current reader always resets hazmat to `None`, and the routing payload infers trailer type from a label.
- Require confirmed, valid dimensions for commercial routing; never silently substitute catalog defaults for missing measurements.
- Ensure routes, hazard filtering and parts requests read the same active profile. Protect account changes and fleet ownership checks.

## Second: commercial truck routing
- Keep Google Maps for map imagery/display only; draw geometry returned by HERE Truck Routing.
- Use an authenticated server-side adapter, with provider credentials kept private and proper unit conversions.
- Calculate from actual origin/destination and confirmed vehicle constraints. Missed-turn reroutes use the same service and profile, not mock geometry.
- Handle unavailable credentials, no legal route, provider warnings, cancellation, stale responses and outages truthfully. Never fall back to a mock route labelled truck-legal.
- Label any remaining unwired examples **Demo**; keep unavailable live functions clearly unavailable.

## Connection dependency
The connector catalog has neither HERE nor Trimble. Live routing requires the owner's HERE Routing API credential and consent to provider usage (which may cost money); Trimble is the alternative. Before requesting a credential, explain setup and confirm this approach. No paid requests during verification. Adapter/unit tests can proceed with mocked responses; live legality and missed-turn checks remain blocked until connected.

## Verification
- Tests for concrete profile values, saving/reloading hazmat and trailer type, invalid/missing dimensions and cross-account isolation.
- Mocked HERE request/response tests: unit conversion, profile constraints, real geometry, initial route/reroute parity, restriction violations and provider errors.
- Existing map, voice cancellation, vehicle-choice and credit regression tests; preview desktop/mobile checks without paid calls.
- Report each item separately as implemented, tested or blocked; do not claim a connected service from mocked tests.

## Technical details
Current evidence: `src/data/vehicles.ts` defines VehicleProfile and routingPayload; `src/lib/vehicles.tsx` loads/saves account equipment; `src/lib/truck-routing.ts` exports mockTruckRoutingProvider; `src/routes/navigation.tsx` calls that provider for reroutes; `src/lib/pickup.tsx` calls it for pickup routes; `docs/google-maps.md` documents display-only Google usage. Extend these seams rather than introducing new workspaces. Any schema change uses an additive migration preserving existing data and access rules.

## Remaining queue
3 corridor hazards/cache; 4 offline trip bundle; 5 HOS/parking suggestions; 6 conversational agent/tools/interruption/wake word; 7 Bluetooth J1939 diagnostics; 8 document classification/30-14-3 day expiry reminders; 9 voice hazard network; 10 actual charged service-fee ledger. These are queued, not implemented or verified.

---

## Previous chat-only plan (historical evidence; not an automatic resume)

## The actual chat-bubble request
The most recent chat-bubble request is the owner's "Hercules chat redesign blueprint", saved as `docs/chat-experience-blueprint.md`. It asks for: a pure black chat background, charcoal surfaces, warm-white text, small gold accents; your messages on the right in rounded grey bubbles, Hercules replies on the left as open text; a rounded message box with typing, send/stop and microphone; honest listening/thinking/speaking states; jump-to-latest; rich reply cards; 44px touch targets; mobile safe-area handling.

Earlier chat-bubble requests that are already built into the same single bubble (not new work):
- "use the first templet and upgrade that chat bubble" (chat message #183): text chat, voice, minimize/reopen, clear, stop.
- BOL / print / email add-on (#185, #188): handled separately, no change here.

Not included (per your instruction): the floating navigation pill styling, ElevenLabs/Medusa voice work, and the Omni workspace/folders task.

## Status by item (evidence: `src/components/hercules/VoiceDock.tsx`, `src/styles.css`, `docs/chat-experience-blueprint.md`)

| Item | Status |
|---|---|
| Blueprint file saved | Done (file exists) |
| Black panel, charcoal composer, gold heading, user bubbles right / replies left | Built in code, NOT verified on screen |
| Formatted replies and code blocks with copy | Built (existing renderer), NOT verified |
| Jump-to-latest button, stay-at-bottom scrolling | Built (existing), NOT verified |
| 44px buttons, gold focus rings, safe-area padding, spoken status for screen readers | Built in code, NOT verified |
| Approval cards (Approve / Decline with status) | Restyled, NOT verified |
| Images, audio, file cards (phase 2) | Blocked: chat messages can't carry attachments yet |
| Saved chat history | Blocked: needs a new database table (not requested yet) |
| Phone / tablet / keyboard testing | Not done: the chat only shows after sign-in and no test account exists |

Orb, gold halo and black/gold styling stay untouched.

## Next concrete step
1. Sign the preview in with a test account (you create one in the preview, or approve me minting a session for an existing account).
2. Open the chat at phone (390px), tablet (820px) and desktop (1280px); send a long message and a code block; check text wraps, the copy button works, jump-to-latest appears when scrolled up, the message box isn't hidden by the keyboard bar, and Tab moves through every button with a visible ring.
3. Fix only what that check shows is broken in `VoiceDock.tsx` / `src/styles.css`, rerun the voice-cancel and credit tests, and report each item above as verified or still open.

No sending real messages to paid voice, no publishing, no billing changes. Other paused Hercules work stays paused.

## Question for you
Should saved chat history (needs a new database table) be added later, or stay out of scope?
