// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme";
import { RouteMap } from "./RouteMap";

/**
 * RouteMap zoom regression coverage.
 *
 * The real Google Maps layer is mocked: the fake basemap hands RouteMap a
 * fake map object via onReady, exactly like the real RealMap does. This pins
 * the zoom contract: navigation starts at street level, recenter restores
 * the actual map zoom even when the prop value didn't change, and switching
 * back into 3D from a wide overview returns to street level.
 */

type FakeMap = {
  zoom: number;
  setZoom: ReturnType<typeof vi.fn>;
  getZoom: () => number;
  panTo: ReturnType<typeof vi.fn>;
  fitBounds: ReturnType<typeof vi.fn>;
};

let fakeMap: FakeMap;

const fakeMaps = {
  Polyline: class {
    setMap() {}
  },
  Marker: class {
    setMap() {}
  },
  LatLngBounds: class {
    extend() {}
  },
  Point: class {
    constructor(
      public x: number,
      public y: number,
    ) {}
  },
  SymbolPath: { CIRCLE: 0 },
};

vi.mock("./RealMap", () => ({
  RealMap: (props: {
    zoom?: number;
    onReady?: (map: unknown, maps: unknown) => void;
    onStatus?: (s: string) => void;
  }) => {
    const { useEffect, useRef } = require("react") as typeof import("react");
    const propsRef = useRef(props);
    propsRef.current = props;
    useEffect(() => {
      propsRef.current.onStatus?.("ready");
      propsRef.current.onReady?.(fakeMap, fakeMaps);
    }, []);
    return <div data-testid="fake-realmap" data-zoom={props.zoom ?? "default"} />;
  },
}));

const polyline = [
  { lat: 32.7, lng: -96.8 },
  { lat: 33.0, lng: -97.0 },
  { lat: 35.4, lng: -97.5 },
];
const position = polyline[0]!;
const segments = [
  {
    id: "seg-1",
    road: "I-35",
    class: "interstate" as const,
    from: polyline[0]!,
    to: polyline[2]!,
    shieldAt: polyline[1]!,
    note: "test",
    miles: 190,
    truckLegal: true,
    clearanceFt: 14.5,
    weightLimitLbs: 80000,
  },
];

function renderMap() {
  return render(
    <ThemeProvider>
      <RouteMap polyline={polyline} position={position} segments={segments} offRoute={false} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  fakeMap = {
    zoom: 14,
    setZoom: vi.fn((z: number) => {
      fakeMap.zoom = z;
    }),
    getZoom: () => fakeMap.zoom,
    panTo: vi.fn(),
    fitBounds: vi.fn(() => {
      fakeMap.zoom = 7; // fitting the whole route zooms far out
    }),
  };
});

describe("RouteMap zoom contract", () => {
  it("starts the navigation camera at street level (zoom 14), not a wide overview", () => {
    renderMap();
    expect(screen.getByTestId("fake-realmap").getAttribute("data-zoom")).toBe("14");
  });

  it("recenter restores actual map zoom to 14 after the driver pinched out, even when state is already 14", () => {
    renderMap();
    fakeMap.zoom = 9; // manual pinch zoom on the real map
    fakeMap.setZoom.mockClear();
    fireEvent.click(screen.getByTitle(/recenter on your truck|following your truck/i));
    expect(fakeMap.setZoom).toHaveBeenCalledWith(14);
    expect(fakeMap.panTo).toHaveBeenCalled();
  });

  it("switching back to 3D from the whole-route overview restores street level", () => {
    renderMap();
    fireEvent.click(screen.getByTitle("Zoom out to the whole route"));
    expect(fakeMap.zoom).toBe(7);
    fireEvent.click(screen.getByTitle(/Navigation view/));
    expect(fakeMap.setZoom).toHaveBeenCalledWith(14);
  });

  it("switching to 3D from a close-in 2D view keeps the driver's own zoom", () => {
    renderMap();
    fireEvent.click(screen.getByTitle("Overhead view"));
    fakeMap.zoom = 16; // driver zoomed in by hand
    fakeMap.setZoom.mockClear();
    fireEvent.click(screen.getByTitle(/Navigation view/));
    expect(fakeMap.setZoom).not.toHaveBeenCalledWith(14);
  });

  it("fitBounds still works for the whole-route view", () => {
    renderMap();
    fireEvent.click(screen.getByTitle("Zoom out to the whole route"));
    expect(fakeMap.fitBounds).toHaveBeenCalled();
  });
});
