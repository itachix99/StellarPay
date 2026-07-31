// Sidebar navigation for the application shell.
//
// Desktop (lg+): a persistent, collapsible rail. Expanded shows icon + label +
// description per item; collapsed shows icons only (with tooltips) and a
// dedicated collapse/expand control.
//
// Mobile (<lg): an off-canvas drawer opened from the TopBar hamburger. Selecting
// a section, pressing Escape, or clicking the backdrop closes it. Background
// scrolling is locked while open and focus returns to the trigger on close.
import { useEffect, useRef } from "react";
import {
  Cpu,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Users,
  X,
} from "lucide-react";
import type { SectionId } from "../../types";

interface NavItemDef {
  id: SectionId;
  label: string;
  description: string;
  icon: typeof Users;
}

const SECTIONS: NavItemDef[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Dashboard & wallet summary",
    icon: LayoutDashboard,
  },
  {
    id: "direct",
    label: "Direct XLM",
    description: "One-off testnet XLM transfers",
    icon: Send,
  },
  {
    id: "soroban",
    label: "Soroban Contract",
    description: "On-chain payroll & events",
    icon: Cpu,
  },
  {
    id: "roster",
    label: "Employee Roster",
    description: "Local payroll contacts",
    icon: Users,
  },
];

interface SidebarProps {
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  rosterCount: number;
}

function NavList({
  collapsed,
  activeSection,
  onSelect,
  rosterCount,
}: {
  collapsed: boolean;
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
  rosterCount: number;
}) {
  return (
    <ul className="space-y-1">
      {SECTIONS.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        const badge = item.id === "roster" ? rosterCount : undefined;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`group flex min-h-[44px] w-full items-center gap-3 rounded-xl border py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                active
                  ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && (
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2">
                    <span className="truncate">{item.label}</span>
                    {badge !== undefined && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    {item.description}
                  </span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({
  activeSection,
  onSelect,
  collapsed,
  onToggleCollapsed,
  drawerOpen,
  onCloseDrawer,
  rosterCount,
}: SidebarProps) {
  const mobileNavRef = useRef<HTMLElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Mobile drawer: lock scroll, close on Escape, restore focus on close.
  useEffect(() => {
    if (!drawerOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseDrawer();
    };
    document.addEventListener("keydown", onKey);
    const first = mobileNavRef.current?.querySelector<HTMLElement>("button");
    requestAnimationFrame(() => first?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lastFocusedRef.current?.focus();
    };
  }, [drawerOpen, onCloseDrawer]);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-slate-200/80 bg-white transition-[width] duration-200 dark:border-slate-800/80 dark:bg-[#0c1513] lg:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
          <NavList
            collapsed={collapsed}
            activeSection={activeSection}
            onSelect={onSelect}
            rosterCount={rosterCount}
          />
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800/60">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
            {!collapsed && <span className="text-xs font-semibold">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile off-canvas drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="presentation"
          onClick={onCloseDrawer}
        >
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
            aria-hidden="true"
          />
          <aside
            id="stellarpay-mobile-nav"
            ref={mobileNavRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-[#0c1513] animate-in slide-in-from-left duration-200"
          >
            <div className="flex h-14 shrink-0 items-center justify-end border-b border-slate-100 px-3 dark:border-slate-800/60">
              <button
                type="button"
                onClick={onCloseDrawer}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
              <NavList
                collapsed={false}
                activeSection={activeSection}
                onSelect={onSelect}
                rosterCount={rosterCount}
              />
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
