# Roadmap

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
