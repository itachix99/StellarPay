// Application shell layout — sidebar rail + scrollable main content column.
// The TopBar and footer are composed in App; this keeps the two-column body.
import type { ReactNode } from "react";

interface AppShellProps {
  /** Desktop rail + mobile drawer (Sidebar). */
  sidebar: ReactNode;
  /** Active section content. */
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex min-h-0 flex-1">
      {sidebar}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
