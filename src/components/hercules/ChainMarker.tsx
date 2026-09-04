import { chainOf, type ChainId } from "@/data/stops";

/**
 * BRANDED TRUCK STOP MARKER.
 *
 * Chain-recognizable badge used both on the navigation map and in lists. Colors
 * and short marks come from the chain directory, so a real stop feed only has to
 * supply the chain id.
 */
export function chainMarkerSvg(chain: ChainId, size = 46) {
  const c = chainOf(chain);
  const w = Math.max(size, 18 + c.short.length * 10);
  const h = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 10}" viewBox="0 0 ${w} ${h + 10}">
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="9" fill="${c.fill}" stroke="#05070a" stroke-width="3"/>
  <path d="M${w / 2 - 7} ${h - 3} L${w / 2} ${h + 8} L${w / 2 + 7} ${h - 3} Z" fill="${c.fill}" stroke="#05070a" stroke-width="2"/>
  <text x="${w / 2}" y="${h / 2 + 6}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="${Math.round(size * 0.34)}" font-weight="900" fill="${c.text}">${c.short}</text>
</svg>`;
}

export function ChainMarker({ chain, size = 32 }: { chain: ChainId; size?: number }) {
  const c = chainOf(chain);
  return (
    <span
      aria-label={`${c.name} marker`}
      className="inline-block shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
      dangerouslySetInnerHTML={{ __html: chainMarkerSvg(chain, size) }}
    />
  );
}
