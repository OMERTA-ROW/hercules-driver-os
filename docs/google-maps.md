# Google Maps configuration (developer notes)

HERCULES renders one real Google Maps basemap through a single shared loader.

- `src/lib/google-maps.ts` — the only place the Maps JavaScript API is loaded.
  Uses the official [`@googlemaps/js-api-loader`](https://github.com/googlemaps/js-api-loader)
  v2 functional API (`setOptions` + `importLibrary`), documented at
  [Load the Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api).
  One in-flight promise is shared by every mount; a failure clears it so a later
  mount can retry.
- `src/components/hercules/RealMap.tsx` — reusable basemap component
  (`center`, `zoom`, `showTraffic`, `isSatellite`, plus optional integration
  props). Live traffic layer, Google zoom + Street View (Pegman) controls,
  pinch-to-zoom, and Google's own attribution stay visible.
- `src/components/hercules/RouteMap.tsx` — HERCULES navigation map. Uses
  `RealMap` as its basemap and draws truck-legal route geometry, highway
  shields, hazards, truck stops and the vehicle marker on top.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | optional | Your own referrer-restricted browser key. Takes precedence. |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | optional | Browser key injected by the Google Maps Platform connector; used when the above is unset. |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | optional | Usage-tracking channel, passed through when present. |
| `VITE_GOOGLE_MAPS_MAP_ID` | optional | Cloud-configured map style ID. Standard maps work without one — leave blank rather than inventing a value. |

Only browser keys belong in `VITE_` variables. Server credentials stay
server-side (server functions / secrets), never in client env vars.

## Key requirements

For live imagery, traffic and Street View to appear, the key must have:

1. **Maps JavaScript API** enabled on its Google Cloud project.
2. **Billing** enabled on that project (required even within the free tier).
3. **Website (HTTP referrer) restrictions** that include the domain serving the
   app — the preview domain and any custom domain, e.g.
   `https://example.com/*` and `https://*.example.com/*` (root and subdomain
   patterns are separate entries).

If no key is configured, or the API fails to load, the map renders a clear
"Live map unavailable" state. It never draws a substitute or invented basemap.

## Scope note

The Google basemap is imagery only. Route geometry comes from the truck routing
adapter; nothing about the Google basemap makes it truck-restriction aware.
Tilt is applied only where Google's renderer supports it and otherwise falls
back to a flat 2D view.

## Tests

```bash
bunx vitest run
```

`src/components/hercules/RealMap.test.tsx` covers props changing before the SDK
resolves, live center/zoom/type/traffic updates, follow-off behaviour,
StrictMode double mount, unmount before the load settles, and the visible
failure state.
