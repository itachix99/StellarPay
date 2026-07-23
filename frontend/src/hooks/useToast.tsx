// Minimal toast system — no dependency, context-based.
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Optional link (e.g. explorer tx URL). */
  href?: string;
  hrefLabel?: string;
}

interface ToastCtx {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId++;
      setToasts((ts) => [...ts, { ...t, id }]);
      // Auto-dismiss after 7s (errors linger a bit longer via same timeout).
      setTimeout(() => dismiss(id), 7000);
    },
    [dismiss],
  );

  return <Ctx.Provider value={{ toasts, push, dismiss }}>{children}</Ctx.Provider>;
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
