# Roadmap

- [x] Apply the approved app-wide matte finish and five selectable colorways
- [x] Convert shared and route-local interactive controls to round glowing bubbles
- [x] Verify matte colorways and control spacing on phone, tablet, and desktop
- [x] Persist matte colorway across signed-in devices and sessions
- [x] Audit every interactive control for matte bubble styling
- [x] Validate all colorway/exposure contrast combinations
- [x] Verify orb and bubble motion performance on phone/tablet, including reduced motion
- [x] Newest-choice-wins colorway sync across tabs, devices and sessions
- [x] Automated visual regression tests for bubble styling, glow and contrast
- [x] Settings motion control that overrides the device setting and saves instantly
- [x] Colorway preview gallery in settings

- [x] Apply pure-black theme with gold and violet illumination
- [x] Convert the three-dot navigation to a compact scrollable panel
- [x] Verify theme and menu across desktop and mobile
- [x] THE BOLT store page (HERCULES-only products, one-time purchases)
- [x] Truck Health reads the live BOLT stream, pairing flow, automated alerts
- [x] Voice and Breakdown Assist use plain-English BOLT fault translations
- [x] Delivery & Supply: voice ordering, per-service coverage notices, favourites

- [x] Inbound arrival notifications: spoken + visual countdowns for delivery couriers and roadside techs, mechanic quoted-ETA timer with 5-minute-out prompt and overdue flag on Breakdown Assist
- [x] Monetization: voice hand-off ordering $5/mo add-on (no per-order fee, platforms process payment); scaled per-order service fee kept only where HERCULES transacts (parts, tires, roadside, fuel/DEF, showers/parking, securement); stackable add-on architecture with live monthly total in Settings
- [x] Account doors: HERCULES Solo, HERCULES Company Driver, ZEUS Fleet with shared model and separate permission scopes; ZEUS company onboarding with company code
- [x] Vehicle/vocation profiles drive routing and hazard filtering; multi-unit drivers asked "What are you in today?" by voice each trip; hazards at real corridor coordinates on the map layer

## Compliance documentation bot — done

- Shared DocRecord model (src/data/compliance.ts): one record per document, permission-filtered to HERCULES / ZEUS / broker, never copied per side.
- Provider (src/lib/compliance.tsx): filing, bulk import, review queue, approvals, exports, spoken expiry queue.
- /compliance: attention strip, my documents, approval queue (approve / reject with reason / request specific doc), folder-drop bulk import with classify + read + match, human review queue, driver/vehicle/fleet export with CSV manifest.
- ComplianceBridge speaks expiries unprompted; voice intent added for paperwork questions. Imported docs tracked identically to camera uploads.
- Added Clearinghouse / IFTA / IRP document kinds, single account compliance light (compliant / expiring / blocked), roster view for company + fleet accounts, scheduled MVR refresh (365-day cycle, 30-day warning).
- FMCSA service layer scaffold (src/lib/fmcsa.ts): provider interface + mock implementation for authority, safety rating, Clearinghouse query and MVR pull; swap in a live implementation behind fmcsaProvider() with no UI change.
- Broker carrier verification: request insurance + authority, verified against FMCSA authority and the carrier's shared vault records. Compliance docs stay part of the account; the $5 unlock remains only for load paperwork.

## Voice personas (done)

- Named ZEUS/HERCULES cast in src/data/voices.ts: Hercules (principal), Zeus, Ares, Atlas, Apollo, Athena, Medusa, Hera, Artemis.
- Real premium speech via src/lib/speech.functions.ts (Lovable AI TTS, per-persona delivery direction + speed).
- Compact scrollable picker with descriptors and per-voice preview: src/components/hercules/VoicePicker.tsx; selection persists in the driver profile.

## Supply & Parts module (done)

- src/data/fees.ts: fee logic now per-category and fully tunable (feeConfig: ladder + floor + ceiling per category). Parts scale $2 → $100; tires/roadside/permits/securement lower ceilings; fuel/showers/laundry/tools flat small. Food/grocery/retail delivery stays $0 (platforms transact, not HERCULES).
- src/data/parts.ts: dealer + aftermarket supplier network (Freightliner, Rush, Navistar/International, Peterbilt, Kenworth, Volvo, Mack, FleetPride, TruckPro, NAPA HD, Amazon, Love's, TA/Petro, Pilot, permit desk); part catalog with fault-code → part mapping, route-aware listings (miles ahead, off-route, stock, ready-by, comes-to-you), and supply items for tires/roadside/fuel & DEF/showers & parking/laundry/securement/tools & PPE/permits, scales & tolling.
- src/lib/parts.tsx: provider seam (real supplier API drops in), identify by speech or fault code, quoting with the HERCULES fee, approval-only order placement, order history + cancel, fees-paid total; persisted locally.
- /parts: voice-first sourcing, live BOLT codes with one-tap "source the part", category rail, branded supplier rows with price/stock/ETA, read-back confirmation showing order + HERCULES fee + total, part-plus-mechanic flow into Breakdown Assist.
- Voice: "parts" topic with part/fault-code identification, cheaper-option follow-up, mechanic follow-up, and a DRIVER APPROVED read-back proposal carrying the fee. Diagnostics and Breakdown both offer to source the part.

## Part pickup routing — done

- `src/data/pickup.ts`: supplier site templates (hours, will-call counter, truck parking, phone), route-corridor coordinates, readiness parsing, drive-time estimate.
- `src/lib/pickup.tsx`: pickup runs (held/offered/routed/collected/declined), auto-offer on pickup orders, truck-legal route via `truckRouting.route()` with the active vehicle profile, hazard filtering, spoken reminders (ready, 15/5 min out, passing the supplier, counter closing, overdue).
- `PickupBridge` speaks announcements and accepts voice dispatch/decline/status ("send it to my map", "where's my part"); `PickupStack` shows the global offer card.
- `/parts` Part Pickup Routing panel; `/navigation` dispatched-run banner with hazards on the way in and "Got the part".
- DRIVER APPROVED: route is only offered; nothing dispatched without explicit confirmation.

## Fleet size tiers → how the vehicle profile is resolved — done

- `src/data/accounts.ts`: `FleetTier` (Tier 1 1–5, Tier 2 5–50, Tier 3 50–100+, open ended), `tierForTrucks`, `fleetTierSpec`, `asksVehiclePerTrip` with a ~10 truck ask ceiling. No seat/driver ceiling at any tier.
- `src/data/fleet-assignments.ts`: company truck/trailer assignment per driver, with a default assignment for a freshly onboarded carrier.
- `src/lib/vehicles.tsx`: resolution is `asked` (solo + ≤10 trucks) or `inherited` (Tier 2/3, silent, from the fleet record); exposes `resolution`, `assignment`, `fleetTier`; `askForTrip` never fires for larger fleets.
- `src/lib/auth.tsx`: `fleetTier` recorded at ZEUS onboarding and on plan/seat change.
- `/zeus`: truck-count tier picker, recorded tier, per-tier trip-question behaviour; `/equipment`: shows assigned-by-company vs asked-out-loud.

## Two adapter families + Vehicle Health — done

- `src/data/bolt.ts`: `adapters` record for THE BOLT (J1939 nine-pin, $149, heavy Class 7–8) and THE BOLT LT (OBD-II sixteen-pin, $99, cars/vans/Sprinters/hotshot Class 3–5/light-medium). Each declares `reports` (live-value keys), `hasTires`, `hasReadiness`, pairing steps, compatibility. Separate fault sets (SPN/FMI vs P-codes), baselines, predictions, auto alerts, OBD emissions readiness monitors. `adapterForSpec()` maps a vehicle profile to its bus.
- `src/lib/bolt.tsx`: active bus follows the resolved vehicle profile (VehicleProvider now wraps BoltProvider); pairing state keyed per family; snapshot filtered to what the bus reports; `activeFaults()/activePredictions()/activeAdapter()` for non-React callers (voice).
- `/health`: renamed Vehicle Health; adapter recommendation + reason + pairing card; capability-filtered metric grid; TPMS only on J1939; emissions readiness only on OBD-II.
- `/store`: both adapter cards with the profile-matched one flagged, plus a "which adapter your truck needs" panel; one-time purchases (`bolt`, `boltObd`) confirmed explicitly, separate from the subscription.
- Breakdown Assist and `/parts` read faults from the live adapter; menu/dashboard labels renamed.

## AI assistance credits — done

- `src/data/ai-credits.ts`: single editable catalogue — monthly tiers (Assist 500/$9, Pro 2,000/$29, Max 5,000/$59), buy-once packs (250/$6, 1,000/$20, 3,000/$49), per-action credit costs, hard input caps, rate limits, provider cost assumptions, always-free list.
- Database: `ai_credit_wallets`, `ai_credit_ledger`, `ai_credit_reservations`, `ai_usage_events`, `billing_events` with RLS (own rows readable only) and server-only grant/revoke routines; monthly credits expire at period end and are consumed before bought-once credits.
- `src/lib/credits.functions.ts`: authenticated wallet/ledger/usage read, quality preference, hosted Checkout (subscription vs payment) with server-side allowlisted price env mapping, customer portal. Honest unavailable state while payment secrets are absent.
- `src/routes/api/public/stripe-webhook.ts`: raw-body signed webhook, 5-minute tolerance, idempotent event claim, renewal replenishment, payment failure / cancellation / refund clawback. The only path that adds credits.
- `src/lib/speech.functions.ts`: was an unauthenticated paid TTS endpoint — now auth-required, rate limited, cached per account, credit-reserved before the provider call, refunded in full on failure, input capped, 20 s abort, in-flight dedupe. Device voice fallback at zero credits.
- `/credits` screen (menu, pricing, settings): balance split monthly vs bought, renewal/expiry dates, low-credit state, per-action costs before use, Eco/Balanced quality, usage and credit history.
- Remaining setup + known limits: `docs/ai-credits.md`.

## Final honesty & entitlement pass — done

- /credits is public: monthly tiers, buy-once packs and Enterprise pricing show signed out (public `getPurchaseAvailability`); wallet, usage/credit history, quality choice, checkout and the quote form require sign-in.
- Fake purchases removed: `src/lib/purchases.tsx` and `src/lib/addons.tsx` no longer grant or remember paid access in the browser; store/documents/settings/supply now report the honest payment-unavailable outcome instead of "purchased/added".
- `/pricing` awaits `changePlan`, blocks double submit and reports real errors; `auth.changePlan` returns `{ok,message}` and surfaces the database error.
- Server-owned account columns locked: `authenticated` may update only name/email/kind/plan/seats/company/fleet_tier/home_base/cdl_number; `status`, `trial_ends_at`, `stripe_customer_id` are service-role only. `anon` lost INSERT/UPDATE/DELETE on profiles. Sign-up no longer writes status/trial (the trigger owns them).
- `NotConnectedNote` labels simulated data on /navigation, /health, /supply, /parts, /breakdown, /stops.
- 37 tests pass (added: profile self-upgrade + billing-table privilege regressions); typecheck and production build clean.

## Driver onboarding (ready)

- Sign-up → /welcome → /equipment → voice pick → returning sign-in verified end to end in browser.
- Trial length is server-set (7 days) in handle_new_user; client cannot extend it.
- Equipment is saved per account in the vehicles table with honest load/save errors and empty states.
- Launch decision outstanding: email confirmation is required on sign-up, so a new driver cannot sign in until the emailed link is clicked. Enable auto-confirm for same-day onboarding, or verify auth email delivery.
- Still unavailable and labelled as such on /welcome: payments/purchases, commercial truck-legal routing provider, engine telemetry adapter, partner ordering.

## Company onboarding (done)

- Real companies/memberships/invites in the database; three paths: company driver, leased operator, fleet owner.
- /company route + setup step; mock carrier directory removed from src/data/accounts.ts.
- Open: payments not live (no card credentials); email confirmation on sign-up still required (awaiting decision); no outside load-board/dispatch integration.

## Release pass — vehicles, top-ups, allowances (done, unpublished)

- Vehicle onboarding covers cars/pickups, passenger vans, cargo/Sprinter vans and box trucks alongside trailers; straight trucks keep clearance and weight checks but are not routed like a car. OBD-II adapter is recommended for all of them.
- Subscriber-only one-time top-ups at $0.30 per credit (50/100/250/500). No purchase and no paid credit use without an active monthly plan, enforced in the database.
- Server-enforced daily and weekly allowances per monthly plan; weeks reset Saturday 00:00 UTC. Paid voice pauses at the limit and names the reset; nothing extra is charged.
- Company access fix: the membership list is scoped to the signed-in account; the direct hotfixes (null-safe member removal, owner-only dispatcher decisions, confirmed-email invites) are reconciled into a migration.
- APPROVED catalogue: Assist $9/150 (10 day / 40 week), Pro $29/600 (25 / 150), Max $100/3,000 (110 / 750); top-ups $0.30 a credit — 10/$3, 50/$15, 100/$30, subscribers only. Days end midnight America/New_York, weeks Saturday 00:00 same zone. Caps reset counters only and never mint credits; subscribed means a paid period still running, including cancel-at-period-end.

## Release review items closed (this pass)

- Booking now goes through one checked database routine: two drivers cannot both
  take a load, non-members and people awaiting approval are refused, and the
  driver who missed out is told so instead of seeing a false success. Verified
  with a throwaway fleet in a transaction that was undone.
- The roster and invites load only for an owner or dispatcher of that company.
- Held top-ups (paid while no monthly plan was running) and plans with no
  allowance set are now shown plainly on the credits screen and refuse paid
  voice instead of running without a limit.
- All invented operational data is gone: no engine readings, no supplier stock or
  prices, no delivery quotes or favourites. Those screens say nothing is
  connected.
- Accepted database warnings: the five billing tables have row security on with
  no policies on purpose (no one but the server reaches them), and the eight
  company/booking routines are callable by signed-in users on purpose because
  each one checks who is calling. No credit-granting routine is reachable by a
  signed-in user.

## Release report — company access pass (bb79f81 follow-up)

Verified by authenticated rollback-only fixture (throwaway owner/driver/outsider accounts,
all rolled back; residue re-checked as zero):

- Pending application survives: `company_my_memberships()` returns the pending row with the
  carrier's name, so the summary does not vanish on reload.
- Roster identity: owner sees the applicant's confirmed email; pending driver, active ordinary
  driver and outsider are all refused server-side (`not_permitted`).
- Spoof writes refused: driver cannot tag a vehicle to a company it does not belong to, cannot
  post a company load, owner cannot post into a foreign company or assign a non-member driver.
- Valid fleet flow succeeds: owner posts a company load, member books it with its own vehicle,
  outsider booking is refused.
- Refund accounting: a held (lapsed-plan) top-up is debited on refund before any release, and a
  later paid month does not release refunded value.

Not connected (no integration, shown as unavailable, never simulated):

- Payments/Stripe (no credentials) — no live billing.
- Commercial truck routing/restriction data — Google Maps base map only; posted signs govern.
- OBD-II / THE BOLT telemetry, parts suppliers, delivery partners, load boards.

## Release report — ElevenLabs live voice provider

Implemented (test evidence, no credentials required):

- `src/lib/elevenlabs.server.ts`: server-only adapter. `ELEVENLABS_API_KEY` read inside
  handlers, sent as `xi-api-key`, never in a URL, never exposed to the browser or a VITE var.
  Model `eleven_flash_v2_5` (low latency), MP3 44.1kHz/128kbps.
- Nine personas (5 male / 4 female) mapped to distinct licensed stock voices, delivery set with
  ElevenLabs voice settings; no cloning. Table in docs/voice-provider.md.
- `speakLine` now calls ElevenLabs inside `runMetered`, so Eco, no-subscription, missing
  allowance config, daily/weekly caps, dedupe, per-account cache, holds and refunds are all
  unchanged. 401 credentials, 401 quota, 429 and outages refund the hold in full and return a
  truthful device-fallback line stating no charge.
- `voiceProviderStatus` (authenticated) validates every persona against the live `/v1/voices`
  library; the voice picker shows connected/not-connected and any unlicensed persona.
- Preview clips relabelled honestly: they are recorded clips from the earlier voice service, not
  ElevenLabs audio; they stay free and identical for everyone.
- `src/lib/elevenlabs.test.ts` (10 assertions, stubbed fetch) covers mapping, model, settings
  ranges, key never in URL, refundable failures for 401/quota/429/5xx, licence gaps, no-key
  refusal and long-clip encoding. Full suite: 95 tests pass; typecheck and build pass.

Blocked — live verification not done:

- No ElevenLabs connection exists on this project, so no real male/female audio has been
  generated and the sample clips have not been re-rendered. The app truthfully reports
  "not connected" and speaks every line with the device voice, free.

Still not connected (unchanged): payments/Stripe, commercial truck routing data, OBD-II
telemetry, parts suppliers, delivery partners, load boards.

## Current correction — original Hercules conversation bubble

- [x] Keep the original Hercules frontend and navigation from the pre-Freight baseline
- [x] Remove the separate setup bubble and cancelled Freight OS screens from active use
- [x] Upgrade the original voice dock with one compact text-and-voice conversation panel
- [x] Verify send, voice stop, approve/decline, clear, minimize/reopen, desktop/mobile, tests, typecheck, and build
- [x] Leave additive Freight backend tables isolated; do not remove data or migrations

## Focused BOL extension

- [x] Add owner-scoped structured BOL drafts using existing load, vehicle, and profile data
- [x] Handle exact create/open/print/email BOL commands through the single voice/text pipeline
- [x] Add compact edit, review, print-preview, and honest email-app fallback controls
- [x] Verify signed-out authorization, desktop/mobile controls, tests, typecheck, and build
- [ ] Verify authenticated save/reload when a test account exists (currently no auth users)
- [x] Harden account-switch races, new-vs-open behavior, item/address validation, load-link RLS, print isolation, and email wording

- [x] Replace legacy colorways/exposure with Flat White, Flat Grey, and Flat Black
- [x] Make the single Hercules bubble solid with ripples only during real audio playback
- [x] Verify theme migration, persistence, speaking lifecycle, reduced motion, and desktop/mobile controls

## Shapher single-theme correction

- [x] Replace the three legacy appearances with one fixed #2D2B29 Shapher theme
- [x] Add local subtle grain and empty-surface motion with a persisted accessible switch
- [x] Remove gold, chromatic, gradient, glass, blur, glow, and metallic styling across shared and standalone pages
- [x] Preserve white-paper/black-ink BOL printing and all existing behavior
- [x] Verify requested existing pages on desktop/mobile and report missing or access-blocked names
- [x] Run tests, type checks, and production build

- [x] Role lockdown on existing pages (roles, switcher, Access Denied, Account Pending)
- [x] Verify solid voice bubble ripple runs only during real audio playback
