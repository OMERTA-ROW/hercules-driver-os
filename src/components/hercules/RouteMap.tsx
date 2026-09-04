import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLng, RoadClass, RouteSegment } from "@/data/routing";
import { useDisplayTheme } from "@/lib/theme";

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

/** BLUE shield = interstate / US highway · WHITE shield = legal county or secondary. */
export function shieldColors(cls: RoadClass) {
  return cls === "county"
    ? { fill: "#f4f6f8", stroke: "#0b0d10", text: "#0b0d10" }
    : { fill: "#1d4ed8", stroke: "#e8eefc", text: "#ffffff" };
}

function shieldSvg(label: string, cls: RoadClass) {
  const c = shieldColors(cls);
  const w = Math.max(52, 22 + label.length * 13);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="46" viewBox="0 0 ${w} 46">
  <path d="M4 6 Q${w / 2} -3 ${w - 4} 6 L${w - 4} 28 Q${w / 2} 45 4 28 Z" fill="${c.fill}" stroke="${c.stroke}" stroke-width="3"/>
  <text x="${w / 2}" y="24" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="17" font-weight="900" fill="${c.text}">${label}</text>
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

type Props = {
  polyline: LatLng[];
  position: LatLng;
  segments: RouteSegment[];
  offRoute: boolean;
};

export function RouteMap({ polyline, position, segments, offRoute }: Props) {
  const { theme } = useDisplayTheme();
  const holder = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "google" | "fallback">(
    MAPS_KEY ? "loading" : "fallback",
  );
  const refs = useRef<{ map?: any; line?: any; truck?: any; shields: any[] }>({ shields: [] });

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
          gestureHandling: "greedy",
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

  // Draw only truck-legal geometry + shields on top of the Google base layer.
  useEffect(() => {
    const google = window.google;
    const map = refs.current.map;
    if (mode !== "google" || !google || !map) return;
    map.setOptions({ styles: theme === "day" ? [] : darkMapStyle });
    refs.current.line?.setMap(null);
    refs.current.line = new google.maps.Polyline({
      path: polyline,
      strokeColor: offRoute ? "#f59e0b" : "#22d3ee",
      strokeOpacity: 0.95,
      strokeWeight: 7,
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
            anchor: new google.maps.Point(30, 46),
          },
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
        fillColor: "#22d3ee",
        fillOpacity: 1,
        strokeColor: "#04141a",
        strokeWeight: 4,
      },
      zIndex: 999,
    });
    map.panTo(position);
  }, [mode, polyline, position, segments, offRoute, theme]);

  if (mode === "google" || mode === "loading") {
    return (
      <div className="relative h-full w-full">
        <div ref={holder} className="h-full w-full" />
        {mode === "loading" ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Loading street map…
          </div>
        ) : null}
      </div>
    );
  }

  return <SchematicMap polyline={polyline} position={position} segments={segments} offRoute={offRoute} />;
}

/** Schematic street-level stand-in used until a Google Maps key is linked. */
function SchematicMap({ polyline, position, segments, offRoute }: Props) {
  const box = useMemo(() => {
    const pts = [...polyline, position];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.25,
      maxLat: Math.max(...lats) + 0.25,
      minLng: Math.min(...lngs) - 0.35,
      maxLng: Math.max(...lngs) + 0.35,
    };
  }, [polyline, position]);

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
      <circle cx={truck.x} cy={truck.y} r={22} fill="#22d3ee" fillOpacity={0.18} />
      <circle cx={truck.x} cy={truck.y} r={11} fill="#22d3ee" stroke="#04141a" strokeWidth={4} />
    </svg>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0c1014" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a949e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#06080a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1b232b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a3745" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#070c12" }] },
];
