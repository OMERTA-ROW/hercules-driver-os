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

## Voice personas (done)
- Named ZEUS/HERCULES cast in src/data/voices.ts: Hercules (principal), Zeus, Ares, Atlas, Apollo, Athena, Medusa, Hera, Artemis.
- Real premium speech via src/lib/speech.functions.ts (Lovable AI TTS, per-persona delivery direction + speed).
- Compact scrollable picker with descriptors and per-voice preview: src/components/hercules/VoicePicker.tsx; selection persists in the driver profile.
