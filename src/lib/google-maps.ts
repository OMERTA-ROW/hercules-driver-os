/// <reference types="google.maps" />
/**
 * ONE Maps JavaScript API loader for the whole app.
 *
 * Uses the official @googlemaps/js-api-loader v2 functional API
 * (setOptions + importLibrary) — see
 * https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 * and https://github.com/googlemaps/js-api-loader
 *
 * Every mount shares ONE in-flight promise, so concurrent mounts (and React
 * StrictMode's double effect) never inject the script twice and never leave a
 * caller hanging. A failed load clears the promise so a later mount can retry.
 *
 * The SDK import is dynamic and browser-guarded: nothing touches `window`
 * during SSR / prerender.
 */

export type MapsApi = typeof google.maps;

const env = import.meta.env as Record<string, string | undefined>;

/**
 * Browser (referrer-restricted) key, chosen by hostname:
 * - On Lovable preview/publish domains (*.lovable.app, *.lovableproject.com)
 *   the managed connector key is used — it is referrer-restricted to those.
 * - Everywhere else (custom domains such as herculeshighway.com) the
 *   project-supplied key VITE_GOOGLE_MAPS_API_KEY is used, since the managed
 *   key's referrer list cannot include custom domains.
 * Never put a server key in a VITE_ variable — these ship to the browser.
 */
const MANAGED_KEY = env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] || "";
const OWN_KEY = env["VITE_GOOGLE_MAPS_API_KEY"] || "";

function isLovableHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com") || h === "localhost";
}

export const MAPS_KEY = isLovableHost() ? MANAGED_KEY || OWN_KEY : OWN_KEY || MANAGED_KEY;

/** Usage-tracking channel, when the connector provides one. */
const MAPS_CHANNEL = env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] || "";

/**
 * Optional cloud-configured map style ID. Standard maps work fine without one,
 * so we only pass it through when it is actually configured — never a made-up
 * placeholder.
 */
export const MAPS_MAP_ID = env["VITE_GOOGLE_MAPS_MAP_ID"] || "";

export function isMapsConfigured() {
  return MAPS_KEY.length > 0;
}

export class MapsUnconfiguredError extends Error {
  constructor() {
    super("google-maps-unconfigured");
    this.name = "MapsUnconfiguredError";
  }
}

let pending: Promise<MapsApi> | null = null;
let authFailed = false;
const authSubs = new Set<() => void>();

/** True once Google rejected the key (bad referrer, no billing, API disabled). */
export function mapsAuthFailed() {
  return authFailed;
}

/** Subscribe to Google's gm_authFailure callback. */
export function onMapsAuthFailure(cb: () => void) {
  authSubs.add(cb);
  return () => {
    authSubs.delete(cb);
  };
}

/** Resolves with `google.maps` once the API is ready. Shared across all callers. */
export function loadMaps(): Promise<MapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("google-maps-no-window"));
  }
  if (!isMapsConfigured()) {
    return Promise.reject(new MapsUnconfiguredError());
  }
  if (!pending) {
    pending = (async () => {
      const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
      // Google calls this when the key itself is rejected — the script loads
      // fine but every tile is refused, so we must surface it, not show a
      // silently broken map.
      (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
        authFailed = true;
        authSubs.forEach((cb) => cb());
      };
      setOptions({
        key: MAPS_KEY,
        v: "weekly",
        ...(MAPS_CHANNEL ? { channel: MAPS_CHANNEL } : {}),
        ...(MAPS_MAP_ID ? { mapIds: [MAPS_MAP_ID] } : {}),
      });
      // core: LatLngBounds/Point/event · maps: Map/Polyline/TrafficLayer
      // marker: the classic Marker used by the route overlays.
      await Promise.all([importLibrary("core"), importLibrary("maps"), importLibrary("marker")]);
      const maps = (window as unknown as { google?: { maps?: MapsApi } }).google?.maps;
      if (!maps) throw new Error("google-maps-load-failed");
      return maps;
    })().catch((err: unknown) => {
      pending = null; // let a later mount try again
      throw err;
    });
  }
  return pending;
}

/** Test seam: forget the shared promise. */
export function __resetMapsLoader() {
  pending = null;
}
