import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// matchMedia polyfill — jsdom ships without window.matchMedia, but the layout
// (useSidebar breakpoint, useTheme system preference) depends on it.
//
// The hook only ever queries "(min-width: 1024px)" (the `lg` breakpoint), so the
// polyfill special-cases that query and treats everything else as non-matching.
// Tests can flip breakpoint state with setViewportWidth().
// ---------------------------------------------------------------------------
const DESKTOP_QUERY = "(min-width: 1024px)";

type MqListener = (e: { matches: boolean; media: string }) => void;

let desktopMatches = false;
const mqListeners = new Map<string, Set<MqListener>>();

/**
 * Simulate a viewport resize in tests. Widths >= 1024 are treated as desktop
 * (sidebar visible), below that as mobile (off-canvas drawer). Fires any
 * registered matchMedia listeners so hooks update reactively.
 */
export function setViewportWidth(width: number) {
  const next = width >= 1024;
  if (next === desktopMatches) return;
  desktopMatches = next;
  mqListeners.forEach((set) => {
    set.forEach((cb) => cb({ matches: next, media: DESKTOP_QUERY }));
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    get matches() {
      return query === DESKTOP_QUERY ? desktopMatches : false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: MqListener) => {
      const set = mqListeners.get(query) ?? new Set<MqListener>();
      set.add(cb);
      mqListeners.set(query, set);
    },
    removeEventListener: (_type: string, cb: MqListener) => {
      mqListeners.get(query)?.delete(cb);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock import.meta.env so components that read VITE_SOROBAN_CONTRACT_ID work.
Object.defineProperty(globalThis, "import", {
  value: {
    meta: {
      env: {
        VITE_SOROBAN_CONTRACT_ID:
          "CASTP46VFFVDQ77FUIDTTTXBBGYIX4YZTANUIVYGGVDXC67UL7VEVLTV",
      },
    },
  },
});

// Minimal IntersectionObserver mock for UI animations.
class IntersectionObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverMock,
});

// jsdom lacks requestAnimationFrame; run callbacks synchronously so focus
// management (PayModal, mobile drawer) is deterministic in tests.
globalThis.requestAnimationFrame ??= (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
globalThis.cancelAnimationFrame ??= () => {};
