import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Hazard } from "@/data/hazards";
import type { LatLng, RoadClass, RouteSegment } from "@/data/routing";
import type { TruckStop } from "@/data/stops";
import { chainMarkerSvg } from "./ChainMarker";
import { RealMap, type RealMapStatus } from "./RealMap";
import type { MapsApi } from "@/lib/google-maps";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";


/**
 * Base map layer.
 *
 * The real Google Maps basemap (RealMap) renders streets, satellite and hybrid
 * imagery plus the live traffic layer and Street View. Only truck-legal
 * geometry returned by the truck routing adapter is ever drawn on top — Google
 * Maps itself is never asked for the route, because it has no commercial-
 * vehicle attributes, so nothing here makes the basemap truck-restriction
 * aware.
 *
 * Without a browser key the map reports itself unavailable rather than drawing
 * an invented basemap.
 */

/**
 * REAL US HIGHWAY SHIELDS
 * -----------------------------------------------------------------------
 * Interstates use the true Interstate escutcheon: red crown, blue field,
 * white numerals and white border. US and state routes use the white US-route
 * escutcheon with black numerals. Truck-legal county/secondary routes get the
 * white shield, matching the way Google Maps marks them.
 */
export function shieldColors(cls: RoadClass) {
  return cls === "county"
    ? { fill: "#f4f6f8", stroke: "#0b0d10", text: "#0b0d10" }
    : { fill: "#1d4ed8", stroke: "#e8eefc", text: "#ffffff" };
}

const INTERSTATE_OUTLINE =
  "M33 2 C24 2 16 6 4 8 C4 30 10 48 33 63 C56 48 62 30 62 8 C50 6 42 2 33 2 Z";
const US_OUTLINE =
  "M5 9 C15 11 25 10 33 3 C41 10 51 11 61 9 L61 31 C61 47 48 57 33 64 C18 57 5 47 5 31 Z";

function shieldSvg(label: string, cls: RoadClass) {
  const isInterstate = /^i[-\s]/i.test(label.trim());
  const num = label.replace(/^(i[-\s]|us[-\s]|u\.s\.[-\s])/i, "").trim();
  const digits = num.replace(/[^0-9A-Za-z]/g, "");
  const wide = digits.length > 2;
  const w = wide ? 78 : 66;
  const fontSize = wide ? 25 : 30;
  const uid = `sh${label.replace(/[^a-z0-9]/gi, "")}${cls}`;
  const sx = w / 66;

  // Street names and long alphanumeric designations don't take a shield —
  // Google shows those as a plain plate, so we do the same.
  if (!isInterstate && (/[a-z]/i.test(digits) || digits.length > 3)) {
    const c = shieldColors(cls);
    const pw = 26 + label.length * 11;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="40" viewBox="0 0 ${pw} 40">
  <rect x="2" y="4" width="${pw - 4}" height="32" rx="7" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="${pw / 2}" y="27" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="16" font-weight="700" fill="${c.text}">${label}</text>
</svg>`;
  }

  if (isInterstate) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="70" viewBox="0 0 ${w} 70">
  <defs><clipPath id="${uid}"><path d="${INTERSTATE_OUTLINE}" transform="scale(${sx} 1)"/></clipPath></defs>
  <path d="${INTERSTATE_OUTLINE}" transform="scale(${sx} 1)" fill="#ffffff" stroke="#0b0d10" stroke-width="2"/>
  <g clip-path="url(#${uid})">
    <rect x="0" y="0" width="${w}" height="70" fill="#123a8f"/>
    <rect x="0" y="0" width="${w}" height="17" fill="#c1121f"/>
  </g>
  <path d="${INTERSTATE_OUTLINE}" transform="scale(${sx} 1)" fill="none" stroke="#ffffff" stroke-width="4"/>
  <path d="${INTERSTATE_OUTLINE}" transform="scale(${sx} 1)" fill="none" stroke="#0b0d10" stroke-width="1.5"/>
  <text x="${w / 2}" y="47" text-anchor="middle" font-family="Helvetica Neue, Arial Narrow, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${digits}</text>
</svg>`;
  }

  const isBlue = cls !== "county";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="70" viewBox="0 0 ${w} 70">
  <path d="${US_OUTLINE}" transform="scale(${sx} 1)" fill="${isBlue ? "#123a8f" : "#f7f8fa"}" stroke="${isBlue ? "#ffffff" : "#0b0d10"}" stroke-width="3"/>
  <path d="${US_OUTLINE}" transform="scale(${sx} 1)" fill="none" stroke="${isBlue ? "#0b0d10" : "#0b0d10"}" stroke-width="1.2" opacity="0.7"/>
  <text x="${w / 2}" y="45" text-anchor="middle" font-family="Helvetica Neue, Arial Narrow, Arial, sans-serif" font-size="${fontSize - 3}" font-weight="700" fill="${isBlue ? "#ffffff" : "#0b0d10"}">${digits}</text>
</svg>`;
}

export function RouteShield({ road, cls }: { road: string; cls: RoadClass }) {
  const label = road.replace(/\s*\(county\)/i, "").trim();
  return (
    <span
      aria-label={`${label} ${cls === "county" ? "county or secondary route" : "highway"} shield`}
      dangerouslySetInnerHTML={{ __html: shieldSvg(label, cls) }}
      className="inline-block shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
    />
  );
}


/**
 * HAZARD ICONS — glanceable badges for the truck hazard layer.
 * Data comes from the pluggable hazard provider, never from the base map.
 */
const hazardTone: Record<Hazard["severity"], { fill: string; text: string }> = {
  critical: { fill: "#dc2626", text: "#ffffff" },
  caution: { fill: "#f59e0b", text: "#12100a" },
  info: { fill: "#e6ebf1", text: "#0b0d10" },
};

export function hazardBadgeText(h: Hazard) {
  switch (h.kind) {
    case "clearance":
      return h.clearanceFt !== undefined
        ? `${Math.floor(h.clearanceFt)}'${Math.round((h.clearanceFt % 1) * 12)}"`
        : "LOW";
    case "grade":
      return `${h.gradePct !== undefined && h.gradePct > 0 ? "+" : ""}${h.gradePct}%`;
    case "switchback":
      return "S-CURVE";
    case "runaway":
      return "RAMP";
    case "emergencyExit":
      return "PULL-OFF";
    case "scale":
      return h.scaleStatus === "Closed" ? "SCALE ✕" : "SCALE";
    case "railroad":
      return "RR ROUGH";
    default:
      return "HAZARD";
  }
}

export function hazardIconSvg(h: Hazard, severity: Hazard["severity"]) {
  const tone = hazardTone[severity] ?? hazardTone.info;
  const label = hazardBadgeText(h);
  const w = Math.max(58, 20 + label.length * 11);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="42" viewBox="0 0 ${w} 42">
  <rect x="2" y="2" width="${w - 4}" height="30" rx="7" fill="${tone.fill}" stroke="#05070a" stroke-width="3"/>
  <path d="M${w / 2 - 7} 31 L${w / 2} 40 L${w / 2 + 7} 31 Z" fill="${tone.fill}" stroke="#05070a" stroke-width="2"/>
  <text x="${w / 2}" y="23" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="15" font-weight="900" fill="${tone.text}">${label}</text>
</svg>`;
}

export function HazardBadge({
  hazard,
  severity,
}: {
  hazard: Hazard;
  severity: Hazard["severity"];
}) {
  return (
    <span
      aria-label={`${hazard.name} hazard marker`}
      className="inline-block shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
      dangerouslySetInnerHTML={{ __html: hazardIconSvg(hazard, severity) }}
    />
  );
}

type MapHazard = { hazard: Hazard; severity: Hazard["severity"] };

/**
 * BASE VIEW
 * Real Google imagery is the base layer in every view — the driver needs to see
 * the actual roads, buildings, terrain and lot shapes under the route. Satellite
 * and hybrid exist for the last mile into a facility or rest area, where the
 * entrance and the lot layout matter more than road names.
 */
export type BaseView = "map" | "satellite" | "hybrid";

const baseViews: { id: BaseView; label: string; hint: string }[] = [
  { id: "map", label: "Map", hint: "Roads and street detail" },
  { id: "satellite", label: "Satellite", hint: "Real imagery — lots and entrances" },
  { id: "hybrid", label: "Hybrid", hint: "Imagery with road names" },
];

/**
 * CAMERA VIEW
 * The map screen is the one exception to the voice-only rule: the driver needs
 * hand controls for the view. Two camera modes mirror Google Maps navigation:
 * a tilted, low-angle 3D view locked to the truck's heading while rolling, and
 * a flat 2D overhead view for previewing the route before rolling. Heading-up
 * vs north-up is a separate toggle, and the driver can always recenter on the
 * truck or zoom out to the whole route in one tap.
 */
export type CameraMode = "nav3d" | "top2d";

/** Heading (degrees, 0=N) of the route at the truck's current position. */
function routeHeading(polyline: LatLng[], position: LatLng): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    if (!a) continue;
    const d = Math.abs(a.lat - position.lat) + Math.abs(a.lng - position.lng);
    if (d < bestDist) {
      bestDist = d;
      const b = polyline[i + 1];
      if (!b) continue;
      best =
        (Math.atan2(
          (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180)),
          b.lat - a.lat,
        ) *
          180) /
        Math.PI;
    }
  }
  return (best + 360) % 360;
}

type Props = {
  polyline: LatLng[];
  position: LatLng;
  segments: RouteSegment[];
  offRoute: boolean;
  hazards?: MapHazard[];
  /** Branded truck stop / pit stop layer. */
  stops?: TruckStop[];
};

export function RouteMap({ polyline, position, segments, offRoute, hazards = [], stops = [] }: Props) {
  const { theme } = useTheme();
  const [view, setView] = useState<BaseView>("map");
  const [camera, setCamera] = useState<CameraMode>("nav3d");
  const [headingUp, setHeadingUp] = useState(true);
  const [followTruck, setFollowTruck] = useState(true);
  const [traffic, setTraffic] = useState(true);
  const [status, setStatus] = useState<RealMapStatus>("loading");
  const [zoom, setZoom] = useState(8);
  const [ready, setReady] = useState(0);
  const heading = useMemo(() => routeHeading(polyline, position), [polyline, position]);
  const refs = useRef<{
    map?: google.maps.Map;
    maps?: MapsApi;
    line?: google.maps.Polyline;
    casing?: google.maps.Polyline;
    truck?: google.maps.Marker;
    shields: google.maps.Marker[];
    hazards: google.maps.Marker[];
    stops: google.maps.Marker[];
  }>({ shields: [], hazards: [], stops: [] });

  const handleReady = useCallback((map: google.maps.Map, maps: MapsApi) => {
    refs.current.map = map;
    refs.current.maps = maps;
    setReady((n) => n + 1);
  }, []);

  // Draw only truck-legal geometry + shields on top of the real base layer.
  useEffect(() => {
    const maps = refs.current.maps;
    const map = refs.current.map;
    if (!maps || !map) return;
    // Route line: a dark casing under a bright core, so the path stays the
    // brightest thing on screen over street detail or satellite imagery.
    refs.current.casing?.setMap(null);
    refs.current.casing = new maps.Polyline({
      path: polyline,
      strokeColor: "#04121a",
      strokeOpacity: 0.9,
      strokeWeight: 15,
      zIndex: 200,
      map,
    });
    refs.current.line?.setMap(null);
    refs.current.line = new maps.Polyline({
      path: polyline,
      strokeColor: offRoute ? "#fbbf24" : "#39e6ff",
      strokeOpacity: 1,
      strokeWeight: 8,
      zIndex: 300,
      map,
    });
    refs.current.shields.forEach((m) => m.setMap(null));
    refs.current.shields = segments.map(
      (s) =>
        new maps.Marker({
          position: s.shieldAt,
          map,
          title: `${s.road} — ${s.note}`,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(shieldSvg(s.road.replace(/\s*\(county\)/i, ""), s.class)),
            anchor: new maps.Point(33, 70),
          },
          zIndex: 600,
        }),
    );
    // HAZARD LAYER markers (only the kinds the driver left switched on).
    refs.current.hazards.forEach((m) => m.setMap(null));
    refs.current.hazards = hazards.map(
      ({ hazard, severity }) =>
        new maps.Marker({
          position: hazard.at,
          map,
          title: `${hazard.name} — ${hazard.detail}`,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(hazardIconSvg(hazard, severity)),
            anchor: new maps.Point(30, 42),
          },
          zIndex: severity === "critical" ? 900 : 500,
        }),
    );
    // TRUCK STOP LAYER — branded chain markers.
    refs.current.stops.forEach((m) => m.setMap(null));
    refs.current.stops = stops.map(
      (stop) =>
        new maps.Marker({
          position: stop.at,
          map,
          title: `${stop.name} — $${stop.dieselPrice.toFixed(3)}/gal · ${stop.parkingOpen}/${stop.parkingTotal} spaces · ${stop.showersOpen} showers open`,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(chainMarkerSvg(stop.chain, 46)),
            anchor: new maps.Point(26, 56),
          },
          zIndex: 400,
        }),
    );
    refs.current.truck?.setMap(null);
    refs.current.truck = new maps.Marker({
      position,
      map,
      title: "Your truck",
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#39e6ff",
        fillOpacity: 1,
        strokeColor: "#04141a",
        strokeWeight: 4,
      },
      zIndex: 999,
    });
  }, [ready, polyline, position, segments, offRoute, hazards, stops]);

  // Overlays we own are detached when the map screen goes away.
  useEffect(
    () => () => {
      const r = refs.current;
      r.casing?.setMap(null);
      r.line?.setMap(null);
      r.truck?.setMap(null);
      [...r.shields, ...r.hazards, ...r.stops].forEach((m) => m.setMap(null));
      r.shields = [];
      r.hazards = [];
      r.stops = [];
      r.map = undefined;
      r.maps = undefined;
    },
    [],
  );

  const recenter = () => {
    setFollowTruck(true);
    if (camera === "nav3d") setZoom(14);
    refs.current.map?.panTo(position);
  };

  const showWholeRoute = () => {
    setFollowTruck(false);
    setCamera("top2d");
    const maps = refs.current.maps;
    const map = refs.current.map;
    if (maps && map && polyline.length) {
      const bounds = new maps.LatLngBounds();
      polyline.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 64);
    }
  };

  // 3D navigation tilts low and locks the view to the truck's heading; 2D is
  // flat overhead. North-up overrides the heading lock. Tilt only renders where
  // Google supports it — elsewhere the map simply stays flat.
  const headingLocked = camera === "nav3d" && headingUp;

  return (
    <div className="relative h-full w-full">
      <RealMap
        center={position}
        zoom={zoom}
        showTraffic={traffic}
        mapTypeId={view === "map" ? "roadmap" : view}
        {...(view === "map" && theme !== "day" ? { styles: darkMapStyle } : {})}
        tilt={camera === "nav3d" ? 55 : 0}
        heading={headingLocked ? heading : 0}
        followCenter={followTruck}
        onReady={handleReady}
        onUserPan={() => setFollowTruck(false)}
        onStatus={setStatus}
        className={cn("rounded-none", view === "map" ? "map-dim" : "map-dim-imagery")}
      />
      {status === "ready" ? (
        <>
          <BaseViewSwitch view={view} onChange={setView} />
          <MapViewControls
            camera={camera}
            onCamera={setCamera}
            headingUp={headingUp}
            onHeadingUp={setHeadingUp}
            following={followTruck}
            onRecenter={recenter}
            onWholeRoute={showWholeRoute}
            traffic={traffic}
            onTraffic={setTraffic}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Base imagery switch — big, glanceable targets in the map corner. Satellite is
 * the one a driver reaches for on the approach, so it is never buried in a menu.
 */
function BaseViewSwitch({
  view,
  onChange,
}: {
  view: BaseView;
  onChange: (v: BaseView) => void;
}) {
  return (
    <div className="absolute left-3 top-3 flex gap-1 rounded-xl border border-foreground/12 bg-background/70 p-1 backdrop-blur-xl">
      {baseViews.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onChange(b.id)}
          aria-pressed={view === b.id}
          title={b.hint}
          className={cn(
            "min-h-11 rounded-lg px-4 font-display text-xs font-light uppercase tracking-[0.18em] transition-colors",
            view === b.id
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}


/**
 * MAP VIEW CONTROLS — the one visible button cluster in the app. Small glass
 * pills tucked into the map corner: 3D/2D camera, heading-up vs north-up,
 * recenter on the truck, and zoom out to the whole route.
 */
function MapViewControls({
  camera,
  onCamera,
  headingUp,
  onHeadingUp,
  following,
  onRecenter,
  onWholeRoute,
}: {
  camera: CameraMode;
  onCamera: (c: CameraMode) => void;
  headingUp: boolean;
  onHeadingUp: (v: boolean) => void;
  following: boolean;
  onRecenter: () => void;
  onWholeRoute: () => void;
}) {
  const pill =
    "grid h-10 w-10 place-items-center rounded-xl border border-foreground/12 bg-background/60 text-muted-foreground backdrop-blur-xl transition-colors hover:bg-accent hover:text-foreground";
  const active = "border-primary/40 bg-primary/15 text-primary";
  return (
    <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
      {/* camera: tilted 3D navigation view vs flat 2D overhead */}
      <div className="flex gap-1 rounded-xl border border-foreground/12 bg-background/60 p-1 backdrop-blur-xl">
        {(
          [
            { id: "nav3d" as const, label: "3D", hint: "Navigation view — tilted, follows your heading" },
            { id: "top2d" as const, label: "2D", hint: "Overhead view" },
          ]
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCamera(c.id)}
            aria-pressed={camera === c.id}
            title={c.hint}
            className={cn(
              "min-h-9 rounded-lg px-3 font-display text-[0.66rem] font-light uppercase tracking-[0.2em] transition-colors",
              camera === c.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {/* orientation: heading-up vs north-up */}
      <button
        type="button"
        onClick={() => onHeadingUp(!headingUp)}
        aria-pressed={headingUp}
        title={headingUp ? "Heading up — tap for north up" : "North up — tap for heading up"}
        className={cn(pill, headingUp && active)}
      >
        {headingUp ? (
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3l4 9h-8z" fill="currentColor" stroke="none" />
            <path d="M12 15v6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 5v3M12 5l-2 3M12 5l2 3" />
            <text x="12" y="17" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">N</text>
          </svg>
        )}
      </button>
      {/* recenter on truck */}
      <button
        type="button"
        onClick={onRecenter}
        aria-pressed={following}
        title={following ? "Following your truck" : "Recenter on your truck"}
        className={cn(pill, following && active)}
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
      {/* whole route at once */}
      <button type="button" onClick={onWholeRoute} title="Zoom out to the whole route" className={pill}>
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" />
          <circle cx="7.5" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
          <path d="M9 15.5c2-1.5 4-3 6-6.5" strokeDasharray="2.5 2.5" />
        </svg>
      </button>
    </div>
  );
}

/** Schematic street-level stand-in used until a Google Maps key is linked. */
function SchematicMap({ polyline, position, segments, offRoute, hazards = [], stops = [], zoom = 1, rotate = 0 }: Props & { zoom?: number; rotate?: number }) {
  const box = useMemo(() => {
    const pts = [...polyline, position, ...hazards.map((h) => h.hazard.at), ...stops.map((s) => s.at)];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.25,
      maxLat: Math.max(...lats) + 0.25,
      minLng: Math.min(...lngs) - 0.35,
      maxLng: Math.max(...lngs) + 0.35,
    };
  }, [polyline, position, hazards, stops]);

  const W = 1000;
  const H = 620;
  const px = (p: LatLng) => ({
    x: ((p.lng - box.minLng) / (box.maxLng - box.minLng)) * W,
    y: H - ((p.lat - box.minLat) / (box.maxLat - box.minLat)) * H,
  });
  const path = polyline.map(px).map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const truck = px(position);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Truck-legal route map">
      <g transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) rotate(${rotate}) translate(${-truck.x} ${-truck.y})`}>
      <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="var(--map-bg, #0a0d11)" />
      {/* street grid — stands in for Google's street-level detail */}
      {Array.from({ length: 22 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 48} y1={0} x2={i * 48} y2={H} stroke="#ffffff" strokeOpacity={0.05} />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 48} x2={W} y2={i * 48} stroke="#ffffff" strokeOpacity={0.05} />
      ))}
      <path d={path} fill="none" stroke="#000" strokeOpacity={0.6} strokeWidth={16} strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke={offRoute ? "#f59e0b" : "#22d3ee"}
        strokeWidth={9}
        strokeLinecap="round"
      />
      {segments.map((s) => {
        const p = px(s.shieldAt);
        const label = s.road.replace(/\s*\(county\)/i, "");
        const w = Math.max(58, 24 + label.length * 14);
        const c = shieldColors(s.class);
        return (
          <g key={s.id} transform={`translate(${p.x - w / 2} ${p.y - 54})`}>
            <path
              d={`M4 6 Q${w / 2} -3 ${w - 4} 6 L${w - 4} 30 Q${w / 2} 48 4 30 Z`}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={3}
            />
            <text
              x={w / 2}
              y={26}
              textAnchor="middle"
              fontSize={18}
              fontWeight={900}
              fill={c.text}
              fontFamily="Arial Black, Arial, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
      {/* HAZARD LAYER badges */}
      {hazards.map(({ hazard, severity }) => {
        const p = px(hazard.at);
        return (
          <g
            key={hazard.id}
            transform={`translate(${p.x - 34} ${p.y + 8})`}
            dangerouslySetInnerHTML={{ __html: hazardIconSvg(hazard, severity) }}
          />
        );
      })}


      {/* TRUCK STOP LAYER badges */}
      {stops.map((stop) => {
        const p = px(stop.at);
        return (
          <g
            key={stop.id}
            transform={`translate(${p.x - 26} ${p.y - 62})`}
            dangerouslySetInnerHTML={{ __html: chainMarkerSvg(stop.chain, 46) }}
          />
        );
      })}
      <circle cx={truck.x} cy={truck.y} r={22} fill="#22d3ee" fillOpacity={0.18} />
      <circle cx={truck.x} cy={truck.y} r={11} fill="#22d3ee" stroke="#04141a" strokeWidth={4} />
      </g>
    </svg>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b0f14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#93a1ad" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#05080b" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a323b" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#b9c4ce" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0e141a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a232c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0a0e12" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#222d38" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#33424f" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0a0e12" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#3d4e5e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9aa7b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#060b11" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3f5566" }] },
];
