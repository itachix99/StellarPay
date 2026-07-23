// Toast viewport — renders active toasts, mobile-friendly (bottom on small screens).
import { useToast } from "../hooks/useToast";

const STYLES = {
  success: "border-brand-500 bg-brand-50 text-brand-700",
  error: "border-red-400 bg-red-50 text-red-700",
  info: "border-slate-300 bg-white text-slate-700",
} as const;

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${STYLES[t.kind]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
          {t.href && (
            <a
              href={t.href}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-semibold underline underline-offset-2"
            >
              {t.hrefLabel ?? "View"}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
