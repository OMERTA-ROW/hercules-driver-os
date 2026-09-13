/// <reference types="google.maps" />
import { act } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Lifecycle / async behaviour of the real basemap: props that change before the
 * SDK resolves, live updates after load, StrictMode double mount, unmount
 * before the load settles, and a failed load surfacing a visible state.
 */

type MapStub = {
  opts: Record<string, unknown>;
  panTo: ReturnType<typeof vi.fn>;
  setZoom: ReturnType<typeof vi.fn>;
  setMapTypeId: ReturnType<typeof vi.fn>;
  setOptions: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
};

const created: MapStub[] = [];
const trafficLayers: { map: unknown }[] = [];
let deferred: { resolve: (v: unknown) => void; reject: (e: unknown) => void };
let loadCalls = 0;

function makeMaps() {
  return {
    Map: class {
      opts: Record<string, unknown>;
      panTo = vi.fn();
      setZoom = vi.fn();
      setMapTypeId = vi.fn();
      setOptions = vi.fn();
      addListener = vi.fn(() => ({ remove: vi.fn() }));
      constructor(_el: HTMLElement, opts: Record<string, unknown>) {
        this.opts = opts;
        created.push(this as unknown as MapStub);
      }
    },
    TrafficLayer: class {
      map: unknown = null;
      setMap(m: unknown) {
        this.map = m;
      }
      constructor() {
        trafficLayers.push(this as unknown as { map: unknown });
      }
    },
    ControlPosition: { RIGHT_BOTTOM: 9 },
  };
}

vi.mock("@/lib/google-maps", () => ({
  MAPS_MAP_ID: "",
  isMapsConfigured: () => true,
  mapsAuthFailed: () => false,
  onMapsAuthFailure: () => () => {},
  loadMaps: () => {
    loadCalls += 1;
    return new Promise((resolve, reject) => {
      deferred = { resolve, reject };
    });
  },
}));

const { RealMap } = await import("./RealMap");

function mount(ui: React.ReactElement, strict = false) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(strict ? <StrictMode>{ui}</StrictMode> : ui));
  return { host, root };
}

beforeEach(() => {
  created.length = 0;
  trafficLayers.length = 0;
  loadCalls = 0;
  document.body.innerHTML = "";
});

describe("RealMap", () => {
  it("uses the latest props when the SDK resolves after a prop change", async () => {
    const { root } = mount(<RealMap center={{ lat: 1, lng: 1 }} zoom={10} />);
    act(() => {
      root.render(<RealMap center={{ lat: 32, lng: -96 }} zoom={15} isSatellite />);
    });
    await act(async () => {
      deferred.resolve(makeMaps());
    });
    expect(created).toHaveLength(1);
    expect(created[0]!.opts["center"]).toEqual({ lat: 32, lng: -96 });
    expect(created[0]!.opts["zoom"]).toBe(15);
    expect(created[0]!.opts["mapTypeId"]).toBe("satellite");
    // Street View / Pegman and zoom controls are enabled.
    expect(created[0]!.opts["streetViewControl"]).toBe(true);
    expect(created[0]!.opts["zoomControl"]).toBe(true);
  });

  it("applies live center, zoom, type and traffic changes after load", async () => {
    const { root } = mount(<RealMap center={{ lat: 1, lng: 1 }} zoom={10} />);
    await act(async () => {
      deferred.resolve(makeMaps());
    });
    const map = created[0]!;
    expect(trafficLayers[0]!.map).toBe(map); // traffic on by default
    act(() => {
      root.render(
        <RealMap center={{ lat: 5, lng: 6 }} zoom={12} showTraffic={false} isSatellite />,
      );
    });
    expect(map.panTo).toHaveBeenCalledWith({ lat: 5, lng: 6 });
    expect(map.setZoom).toHaveBeenCalledWith(12);
    expect(map.setMapTypeId).toHaveBeenCalledWith("satellite");
    expect(trafficLayers[0]!.map).toBe(null);
    act(() => {
      root.render(<RealMap center={{ lat: 5, lng: 6 }} zoom={12} showTraffic />);
    });
    expect(trafficLayers[0]!.map).toBe(map); // toggles back on
  });

  it("does not move the camera when following is off", async () => {
    const { root } = mount(<RealMap center={{ lat: 1, lng: 1 }} followCenter={false} />);
    await act(async () => {
      deferred.resolve(makeMaps());
    });
    act(() => {
      root.render(<RealMap center={{ lat: 9, lng: 9 }} followCenter={false} />);
    });
    expect(created[0]!.panTo).not.toHaveBeenCalled();
  });

  it("creates one map per mount under StrictMode", async () => {
    mount(<RealMap center={{ lat: 1, lng: 1 }} />, true);
    await act(async () => {
      deferred.resolve(makeMaps());
    });
    expect(created).toHaveLength(1);
    expect(loadCalls).toBeGreaterThanOrEqual(1);
  });

  it("survives unmount before the load settles", async () => {
    const { root } = mount(<RealMap center={{ lat: 1, lng: 1 }} />);
    act(() => root.unmount());
    await act(async () => {
      deferred.resolve(makeMaps());
    });
    expect(created).toHaveLength(0);
  });

  it("shows a visible unavailable state when the load fails", async () => {
    const { host } = mount(<RealMap center={{ lat: 1, lng: 1 }} />);
    await act(async () => {
      deferred.reject(new Error("boom"));
    });
    expect(host.textContent).toContain("Live map unavailable");
  });
});
