// Toast viewport — renders active toasts, mobile-friendly (bottom on small screens).
import { useToast } from "../hooks/useToast";
import { CheckCircle2, AlertCircle, Info, ExternalLink, X } from "lucide-react";

const STYLES = {
  success: "border-emerald-200 bg-emerald-50/95 text-emerald-900 shadow-md shadow-emerald-900/5",
  error: "border-rose-200 bg-rose-50/95 text-rose-900 shadow-md shadow-rose-900/5",
  info: "border-slate-200 bg-white/95 text-slate-900 shadow-md shadow-slate-900/10",
} as const;

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto w-full max-w-sm rounded-2xl border p-4 text-xs backdrop-blur-xs transition-all duration-200 animate-in slide-in-from-bottom-2 ${STYLES[t.kind]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {t.kind === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
              {t.kind === "error" && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
              {t.kind === "info" && <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold leading-relaxed">{t.message}</p>
                {t.href && (
                  <a
                    href={t.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>{t.hrefLabel ?? "View Explorer"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 transition"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
