import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
