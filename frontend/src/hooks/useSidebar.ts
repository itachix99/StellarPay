// Sidebar navigation state for the application shell.
//
// Owns the selected section (persisted), the desktop collapsed preference
// (persisted), and the mobile off-canvas drawer open state. The `lg` Tailwind
// breakpoint (1024px) is the desktop/mobile boundary — see setup.ts for the
// jsdom matchMedia polyfill used in tests.
import { useCallback, useEffect, useState } from "react";
import type { SectionId } from "../types";

const DESKTOP_QUERY = "(min-width: 1024px)";
const SECTION_KEY = "stellarpay.section";
const COLLAPSED_KEY = "stellarpay.sidebar.collapsed";
const VALID_SECTIONS: SectionId[] = ["overview", "direct", "soroban", "roster"];

function isSection(value: unknown): value is SectionId {
  return typeof value === "string" && (VALID_SECTIONS as string[]).includes(value);
}

function readStoredSection(): SectionId | null {
  try {
    const raw = localStorage.getItem(SECTION_KEY);
    return isSection(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readStoredCollapsed(): boolean | null {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw === "true" ? true : raw === "false" ? false : null;
  } catch {
    return null;
  }
}

export function useSidebar(defaultSection: SectionId = "overview") {
  const [activeSection, setActiveSection] = useState<SectionId>(
    () => readStoredSection() ?? defaultSection,
  );
  const [collapsed, setCollapsed] = useState<boolean>(
    () => readStoredCollapsed() ?? false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches,
  );

  // Persist preferences across sessions.
  useEffect(() => {
    try {
      localStorage.setItem(SECTION_KEY, activeSection);
    } catch {
      // storage unavailable — keep in-memory only
    }
  }, [activeSection]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // storage unavailable — keep in-memory only
    }
  }, [collapsed]);

  // Track breakpoint changes; leaving mobile closes the drawer.
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: { matches: boolean }) => {
      setIsDesktop(e.matches);
      if (e.matches) setDrawerOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const select = useCallback((id: SectionId) => {
    setActiveSection(id);
    setDrawerOpen(false);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  return {
    activeSection,
    select,
    collapsed,
    toggleCollapsed,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isDesktop,
  };
}
