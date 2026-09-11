# Two adapter families + Vehicle Health

Extend diagnostics so it covers heavy trucks *and* everything lighter, with the screen adapting to whatever adapter is actually plugged in.

## Hardware

Two HERCULES-branded adapters, both optional one-time purchases, both separate from the subscription:

| Adapter | Fits | Price |
| --- | --- | --- |
| HERCULES J1939 9-pin (THE BOLT) | Class 7–8 heavy trucks, nine-pin Deutsch port | $149.00 (unchanged) |
| HERCULES OBD-II 16-pin (THE BOLT LT) | Cars, cargo vans, Sprinters, van haulers, hotshot Class 3–5, light/medium duty | $99.00 (single editable value) |

## Readouts adapt to the connected adapter

Each adapter declares what it can report. Anything the connected vehicle cannot report is **hidden**, never shown blank.

- **J1939:** engine hours, DEF level, brake wear, idle time, aftertreatment, tire pressure, full commercial SPN/FMI fault set, plus the shared basics.
- **OBD-II:** standard powertrain P-codes, short/long fuel trim, coolant temp, oil temp, battery voltage, emissions readiness monitors. No DEF, no brake wear, no idle/aftertreatment, no trailer TPMS.

Predictive maintenance, plain-English fault translation and unprompted spoken alerts run on both, sourced from whichever adapter is live.

## Selection follows the vehicle profile

The equipment profile the driver already set up decides the recommendation: trailer-pulling and Class 7–8 profiles get the nine-pin, cargo van / Sprinter and light-duty profiles get the OBD-II. Vehicle Health and the Store both say which one they need, why, and offer it as the optional purchase. Nothing auto-charges — the driver confirms.

## Rename

"Truck Health" becomes "Vehicle Health" everywhere it reads (screen title, menus, dashboard link, page title/description) so it reads right for a van or car profile.

## Downstream wiring

Breakdown Assist and voice-ordered parts read the **active** diagnostics source rather than the hard-wired heavy-truck code list, so a van's P-codes flow into roadside help and parts sourcing the same way.

## Technical notes

- `src/data/bolt.ts`: add `AdapterKind = "j1939" | "obd2"`, an `adapters` record (product copy, price, SKU, pairing steps, compatibility, capability key list), per-family fault frames / baseline values / predictions / auto-alerts, and `adapterForSpec(spec)` mapping a `VehicleSpec` to the recommended family.
- `src/lib/purchases.tsx`: add `boltObd` to `PurchaseId` (`bolt` stays the nine-pin).
- `src/lib/bolt.tsx`: connection state keyed per adapter kind; `activeKind` derived from the resolved vehicle profile via `useVehicle()`; snapshot filtered through the adapter's capability list; `boltSnapshot(kind)` / `boltSpokenSummary(kind)` for non-React callers.
- `src/routes/health.tsx`: title "Vehicle Health", adapter recommendation + pairing card for the matching family, capability-filtered metric grid, TPMS panel only for J1939, emissions-readiness panel only for OBD-II.
- `src/routes/store.tsx`: both adapter cards, the recommended one flagged against the current profile.
- `src/routes/breakdown.tsx`, `src/routes/parts.tsx`, `src/lib/voice.tsx`: read faults from the active source.
- `AppShell.tsx`, `DotMenu.tsx`, `dashboard.tsx`: label rename.
