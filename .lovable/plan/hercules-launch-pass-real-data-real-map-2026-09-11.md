# HERCULES launch pass — real data, real map

This pass replaces the placeholder app with a real backend, real sign-in, and a real Google map. Two things need your credentials before parts of it can go live, so the plan is sequenced to build everything and light it up as keys arrive.

## What you need to supply

1. **Google Maps** — the map cannot look real without a Google Maps Platform key. I'll connect the Google Maps Platform connector, which supplies the browser key for the live map plus the server-side APIs (Routes, Roads, Places, Street View, Geocoding). Without it there is no photographic map.
2. **Delivery partners** — Uber Eats, DoorDash and Instacart do not offer public ordering APIs, and their terms forbid third-party order placement. I will build the real credential-and-OAuth layer reading from secrets, but until you have a signed partner agreement and keys, those screens will honestly show "Not yet connected — add API credentials". No simulated orders anywhere.

## 1. Backend and real accounts

- Turn on Lovable Cloud (database, auth, storage, server functions).
- Real email/password sign-in with sessions. Remove the demo sign-in shortcut and every local-storage stand-in account.
- Schema: `profiles`, `vehicles` (vocation + equipment type), `loads`, `trips`, `truck_health_readings`, `financial_entries`, `alerts`, `documents`, plus row-level security so a driver only sees their own rows and fleet rows they belong to.
- Every screen reads from these tables through real queries.

## 2. Purge the fake data

- Delete seeded rows and hardcoded numbers from the dashboard, load board, vehicle health, financials, alerts and driver profile.
- Each surface gets an honest empty state instead: "No loads available", "Connect your ECU adapter", "No entries yet".
- Mileage, load counts and reset math compute from real trip and load rows only.

## 3. The map (the priority)

Rebuild the map on the real Google Maps JavaScript API:

- Real vector basemap: named streets, buildings, lane geometry, true road classes. Satellite and hybrid as view options.
- Live traffic layer in real green / yellow / red.
- Street View — drop into street level at a pickup, delivery, or truck stop.
- Location accurate at login: geolocation permission on first load, high-accuracy GPS, position snapped to the road with the Roads API so the marker never floats.
- Steady camera: smooth follow, no jitter or drift; distinct driver marker with a heading arrow.
- Tilted 3D car-perspective view that rotates with heading, plus top-down.
- Full two-finger pinch zoom in and out, smooth pan, and a "recenter on me" control that snaps back to follow.
- Keeps the existing 3D / top-down / zoom / satellite controls.

## 4. Fuel and stops overlay

- A toggle for whether fuel and rest stops show at all — off by default.
- When the driver asks for the nearest fuel, highway shields hide so only stop markers remain.
- Truck stop markers use each brand's real mark, sourced from Google Places business data — no invented or approximated logos. If Places returns no logo for a location, it falls back to a plain marker with the brand name rather than a drawn imitation.
- Highway shields use real Interstate / US Route / state route artwork, correct for the road.

## 5. Theme lock

- Pure black background on every screen, gold lettering and accents, nothing else in the interface.
- The map keeps true-to-life color: traffic colors, brand logo colors, route line. The map is not restyled to match the theme.

## Order of work

1. Cloud on, schema, real sign-in, purge fake data, empty states everywhere.
2. Connect Google Maps, then rebuild the map: basemap, traffic, Street View, GPS + road snapping, follow camera, gestures, recenter.
3. Stops overlay, real brand marks, real shields.
4. Theme lock pass across every screen.
5. Delivery credential layer with honest not-connected states, coverage notice kept.

## Notes

- The map's realistic colors are the only exception to black and gold; that is deliberate.
- Google APIs used: Maps JavaScript, Street View, Routes, Roads, Places, Geocoding.
- All keys read from secrets. Nothing embedded in the code.
