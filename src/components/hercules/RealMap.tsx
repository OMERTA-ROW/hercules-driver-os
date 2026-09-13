import { useEffect, useRef, useState } from "react";
import {
  isMapsConfigured,
  loadMaps,
  MAPS_MAP_ID,
  mapsAuthFailed,
  onMapsAuthFailure,
  type MapsApi,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

/**
 * REAL MAP
 * -----------------------------------------------------------------------
 * A reusable, real Google Maps basemap: photographic streets or satellite
 * imagery, the live traffic layer, and Google's own zoom + Street View
 * (Pegman) controls. No schematic stand-in and no fabricated imagery — if a
 * browser key is missing or the API fails to load, the component says so.
 *
 * This is a BASEMAP only. It never decides a route; HERCULES draws its
 * truck-legal geometry on top through `onReady`.
 */

export type MapLatLng = { lat: number; lng: number };
export type RealMapStatus = "loading" | "ready" | "unconfigured" | "error";

export type RealMapProps = {
  /** Camera target. */
  center: MapLatLng;
  zoom?: number;
  /** Live traffic layer — on by default. Toggles both directions. */
  showTraffic?: boolean;
  /** Satellite imagery instead of the street map. */
  isSatellite?: boolean;

  /* ---- optional integration props (used by RouteMap) ---- */
  /** Explicit base view; overrides `isSatellite` when set. */
  mapTypeId?: "roadmap" | "satellite" | "hybrid";
  /** Custom styling — only meaningful for the roadmap type. */
  styles?: google.maps.MapTypeStyle[];
  tilt?: number;
  heading?: number;
  /** When false, prop `center` changes no longer move the camera (manual pan / follow-off). */
  followCenter?: boolean;
  className?: string;
  onReady?: (map: google.maps.Map, maps: MapsApi) => void;
  onUserPan?: () => void;
  onStatus?: (status: RealMapStatus) => void;
};

function resolveType(p: RealMapProps): "roadmap" | "satellite" | "hybrid" {
  return p.mapTypeId ?? (p.isSatellite ? "satellite" : "roadmap");
}

export function RealMap(props: RealMapProps) {
  const {
    center,
    zoom = 14,
    showTraffic = true,
    className,
    followCenter = true,
    onReady,
    onUserPan,
    onStatus,
  } = props;

  const holder = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RealMapStatus>(() =>
    isMapsConfigured() ? "loading" : "unconfigured",
  );
  const mapRef = useRef<google.maps.Map | null>(null);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);

  /** Latest props, so a load that resolves later uses current values. */
  const latest = useRef(props);
  latest.current = props;
  const cbs = useRef({ onReady, onUserPan, onStatus });
  cbs.current = { onReady, onUserPan, onStatus };

  useEffect(() => {
    cbs.current.onStatus?.(status);
  }, [status]);

  // A rejected key (referrer restriction, disabled API, billing off) never
  // rejects the load — Google reports it through gm_authFailure.
  useEffect(() => {
    if (mapsAuthFailed()) setStatus("error");
    return onMapsAuthFailure(() => setStatus("error"));
  }, []);

  // Mount exactly one map per component instance. StrictMode's second pass
  // tears the first one down through the cleanup below.
  useEffect(() => {
    if (!isMapsConfigured()) {
      setStatus("unconfigured");
      return;
    }
    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];
    setStatus("loading");

    loadMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        const p = latest.current;
        const type = resolveType(p);
        const map = new maps.Map(holder.current, {
          center: p.center,
          zoom: p.zoom ?? 14,
          mapTypeId: type,
          ...(MAPS_MAP_ID ? { mapId: MAPS_MAP_ID } : {}),
          ...(type === "roadmap" && p.styles ? { styles: p.styles } : {}),
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
          // Street View / Pegman lives bottom-right, clear of the HUD clusters.
          streetViewControl: true,
          streetViewControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
          scaleControl: true,
          clickableIcons: false,
          gestureHandling: "greedy", // pinch-to-zoom and one-finger pan
          keyboardShortcuts: true,
          tilt: p.tilt ?? 0,
          heading: p.heading ?? 0,
          backgroundColor: "#000000",
        });
        mapRef.current = map;
        if (p.showTraffic ?? true) {
          trafficRef.current = new maps.TrafficLayer();
          trafficRef.current.setMap(map);
        }
        listeners.push(map.addListener("dragstart", () => cbs.current.onUserPan?.()));
        setStatus(mapsAuthFailed() ? "error" : "ready");
        cbs.current.onReady?.(map, maps);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(isMapsConfigured() ? "error" : "unconfigured");
      });

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove());
      trafficRef.current?.setMap(null);
      trafficRef.current = null;
      mapRef.current = null;
      if (holder.current) holder.current.innerHTML = "";
    };
  }, []);

  // Camera target. Skipped while the driver is panning by hand (followCenter
  // false) and when the coordinates did not actually change.
  const appliedCenter = useRef<MapLatLng | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followCenter) return;
    const prev = appliedCenter.current;
    if (prev && prev.lat === center.lat && prev.lng === center.lng) return;
    appliedCenter.current = { lat: center.lat, lng: center.lng };
    map.panTo(center);
  }, [status, center.lat, center.lng, followCenter, center]);

  const appliedZoom = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (appliedZoom.current === zoom) return;
    appliedZoom.current = zoom;
    map.setZoom(zoom);
  }, [status, zoom]);

  // Imagery type + styling.
  const type = resolveType(props);
  const styles = props.styles;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMapTypeId(type);
    map.setOptions({ styles: type === "roadmap" ? (styles ?? []) : [] });
  }, [status, type, styles]);

  // Live traffic, both directions.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showTraffic) {
      if (!trafficRef.current) {
        const maps = (window as unknown as { google?: { maps?: MapsApi } }).google?.maps;
        if (!maps) return;
        trafficRef.current = new maps.TrafficLayer();
      }
      trafficRef.current.setMap(map);
    } else {
      trafficRef.current?.setMap(null);
    }
  }, [status, showTraffic]);

  // Tilt / heading. Tilt only renders where Google supports it; elsewhere the
  // map simply stays flat — no promise of 45° aerial imagery.
  const tilt = props.tilt ?? 0;
  const headingDeg = props.heading ?? 0;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({ tilt, heading: headingDeg });
  }, [status, tilt, headingDeg]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-2xl", className)}>
      <div ref={holder} className="h-full w-full" />
      {status !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center bg-background/85 p-6 text-center">
          {status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading live map…</p>
          ) : (
            <div className="max-w-sm space-y-2">
              <p className="font-display text-sm uppercase tracking-[0.18em] text-primary">
                Live map unavailable
              </p>
              <p className="text-xs text-muted-foreground">
                {status === "unconfigured"
                  ? "No Google Maps browser key is configured, so real imagery, traffic and Street View cannot load."
                  : "The Google Maps API did not load. Check the key's Maps JavaScript API access, billing and website (referrer) restrictions."}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
