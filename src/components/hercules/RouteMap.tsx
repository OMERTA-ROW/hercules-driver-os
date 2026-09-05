import { useEffect, useMemo, useRef, useState } from "react";
import type { Hazard } from "@/data/hazards";
import type { LatLng, RoadClass, RouteSegment } from "@/data/routing";
import type { TruckStop } from "@/data/stops";
import { chainMarkerSvg } from "./ChainMarker";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";


/**
 * Base map layer.
 *
 * Google Maps JS API renders the street-level base map when a browser key is
 * available (VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY, injected by the
 * Google Maps connector). Only truck-legal geometry returned by the truck
 * routing adapter is ever drawn on top — Google Maps itself is never asked for
 * the route, because it has no commercial-vehicle attributes.
 *
 * With no key linked yet, we fall back to a schematic street rendering so the
 * whole navigation package is usable with mock data.
 */

const MAPS_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
  | string
  | undefined;
const MAPS_CHANNEL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
  | string
  | undefined;

declare global {
  interface Window {
    google?: any;
    __hercMapsReady?: boolean;
    __hercInitMaps?: () => void;
  }
}

function loadGoogleMaps(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!MAPS_KEY) return reject(new Error("no-key"));
    if (window.__hercMapsReady && window.google?.maps) return resolve(window.google);
    const existing = document.getElementById("herc-gmaps");
    const done = () => (window.google?.maps ? resolve(window.google) : reject(new Error("failed")));
    window.__hercInitMaps = () => {
      window.__hercMapsReady = true;
      done();
    };
    if (existing) return;
    const s = document.createElement("script");
    s.id = "herc-gmaps";
    s.async = true;
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&loading=async&callback=__hercInitMaps` +
      (MAPS_CHANNEL ? `&channel=${MAPS_CHANNEL}` : "");
    s.onerror = () => reject(new Error("script-error"));
    document.head.appendChild(s);
  });
}

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
  const holder = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "google" | "fallback">(
    MAPS_KEY ? "loading" : "fallback",
  );
  const [view, setView] = useState<BaseView>("map");
  const refs = useRef<{
    map?: any;
    line?: any;
    casing?: any;
    truck?: any;
    shields: any[];
    hazards: any[];
    stops: any[];
  }>({ shields: [], hazards: [], stops: [] });


  useEffect(() => {
    if (!MAPS_KEY) return;
    let dead = false;
    loadGoogleMaps()
      .then((google) => {
        if (dead || !holder.current) return;
        const map = new google.maps.Map(holder.current, {
          center: position,
          zoom: 8,
          disableDefaultUI: true,
          zoomControl: true,
          scaleControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          tilt: 0,
          backgroundColor: "#0b0f14",
          mapTypeId: "roadmap",
          styles: theme === "day" ? [] : darkMapStyle,
        });
        refs.current.map = map;
        setMode("google");
      })
      .catch(() => !dead && setMode("fallback"));
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Base imagery choice. Custom styling only applies to the road map; satellite
  // and hybrid imagery are dimmed with CSS instead.
  useEffect(() => {
    const map = refs.current.map;
    if (mode !== "google" || !map) return;
    map.setMapTypeId(view === "map" ? "roadmap" : view === "satellite" ? "satellite" : "hybrid");
    map.setOptions({ styles: view === "map" && theme !== "day" ? darkMapStyle : [] });
  }, [mode, view, theme]);

  // Draw only truck-legal geometry + shields on top of the Google base layer.
  useEffect(() => {
    const google = window.google;
    const map = refs.current.map;
    if (mode !== "google" || !google || !map) return;
    // Route line: a dark casing under a bright core, so the path stays the
    // brightest thing on screen over street detail or satellite imagery.
    refs.current.casing?.setMap(null);
    refs.current.casing = new google.maps.Polyline({
      path: polyline,
      strokeColor: "#04121a",
      strokeOpacity: 0.9,
      strokeWeight: 15,
      zIndex: 200,
      map,
    });
    refs.current.line?.setMap(null);
    refs.current.line = new google.maps.Polyline({
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
        new google.maps.Marker({
          position: s.shieldAt,
          map,
          title: `${s.road} — ${s.note}`,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(shieldSvg(s.road.replace(/\s*\(county\)/i, ""), s.class)),
            anchor: new google.maps.Point(33, 70),
          },
          zIndex: 600,
        }),
    );
    // HAZARD LAYER markers (only the kinds the driver left switched on).
    refs.current.hazards.forEach((m) => m.setMap(null));
    refs.current.hazards = hazards.map(
      ({ hazard, severity }) =>
        new google.maps.Marker({
          position: hazard.at,
          map,
          title: `${hazard.name} — ${hazard.detail}`,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(hazardIconSvg(hazard, severity)),
            anchor: new google.maps.Point(30, 42),
          },
          zIndex: severity === "critical" ? 900 : 500,
        }),
    );
    // TRUCK STOP LAYER — branded chain markers.
    refs.current.stops.forEach((m) => m.setMap(null));
    refs.current.stops = stops.map(
      (stop) =>
        new google.maps.Marker({
          position: stop.at,
          map,
          title: `${stop.name} — $${stop.dieselPrice.toFixed(3)}/gal · ${stop.parkingOpen}/${stop.parkingTotal} spaces · ${stop.showersOpen} showers open`,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(chainMarkerSvg(stop.chain, 46)),
            anchor: new google.maps.Point(26, 56),
          },
          zIndex: 400,
        }),
    );
    refs.current.truck?.setMap(null);
    refs.current.truck = new google.maps.Marker({
      position,
      map,
      title: "Your truck",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#39e6ff",
        fillOpacity: 1,
        strokeColor: "#04141a",
        strokeWeight: 4,
      },
      zIndex: 999,
    });
    map.panTo(position);
  }, [mode, polyline, position, segments, offRoute, theme, hazards, stops]);


  if (mode === "google" || mode === "loading") {
    return (
      <div className="relative h-full w-full">
        <div
          ref={holder}
          className={cn(
            "h-full w-full",
            view === "map" ? "map-dim" : "map-dim-imagery",
          )}
        />
        <BaseViewSwitch view={view} onChange={setView} />
        {mode === "loading" ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Loading street map…
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <SchematicMap
        polyline={polyline}
        position={position}
        segments={segments}
        offRoute={offRoute}
        hazards={hazards}
        stops={stops}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
        <p className="glass rounded-lg px-3 py-2 text-xs text-muted-foreground">
          Schematic view. Add a Google Maps browser key to see the real roads, buildings and lot
          layouts under the route, with satellite and hybrid for the last mile.
        </p>
      </div>
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


/** Schematic street-level stand-in used until a Google Maps key is linked. */
function SchematicMap({ polyline, position, segments, offRoute, hazards = [], stops = [] }: Props) {
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
      <rect width={W} height={H} fill="var(--map-bg, #0a0d11)" />
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
