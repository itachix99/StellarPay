import { useState, useRef, useEffect, forwardRef, type ButtonHTMLAttributes, type ReactNode, type FormEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  LogOut,
  PlusCircle,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import type { Employee, PaymentDraft } from "../types";
import { isValidPublicKey, isValidXlmAmount } from "../lib/stellar";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <RefreshCw className={`h-4 w-4 animate-spin ${className}`} aria-hidden="true" />
  );
}

export function shortKey(key: string): string {
  return key.length > 12 ? `${key.slice(0, 6)}…${key.slice(-6)}` : key;
}

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-emerald-500 dark:hover:bg-emerald-400 font-bold focus-visible:ring-emerald-500 shadow-xs active:scale-[0.98]",
  secondary:
    "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 focus-visible:ring-slate-700 shadow-xs active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500 shadow-xs active:scale-[0.98]",
  ghost:
    "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-400",
  outline:
    "border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14201e] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a2b28] focus-visible:ring-slate-400 shadow-xs",
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#121b19] p-5 sm:p-6 shadow-2xs ${className}`}
    >
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div>
            {typeof title === "string" ? (
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Wallet Header Bar                                                          */
/* -------------------------------------------------------------------------- */
interface WalletBarProps {
  address: string | null;
  balance: string | null;
  network: "TESTNET" | "WRONG" | "UNKNOWN";
  connecting: boolean;
  loadingBalance: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function WalletBar({
  address,
  balance,
  network,
  connecting,
  loadingBalance,
  onConnect,
  onDisconnect,
  theme,
  onToggleTheme,
}: WalletBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const networkMeta: Record<string, { color: string; bg: string; label: string }> = {
    TESTNET: {
      color: "bg-emerald-500",
      bg: "bg-slate-100 dark:bg-[#14201e]",
      label: "Stellar Testnet",
    },
    WRONG: {
      color: "bg-rose-500 animate-pulse",
      bg: "bg-rose-50 dark:bg-rose-950/60",
      label: "Wrong Network — switch to Testnet",
    },
    UNKNOWN: {
      color: "bg-amber-500 animate-pulse",
      bg: "bg-amber-50 dark:bg-amber-950/60",
      label: "Network Unknown — check wallet",
    },
  };

  const meta = networkMeta[network] ?? networkMeta.UNKNOWN;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Network Indicator Pill — shows real wallet network state once connected */}
      {!address ? (
        <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-[#14201e] px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span>No wallet connected</span>
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${meta.bg} ${
            network !== "TESTNET"
              ? "border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
              : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          }`}
          title={
            network === "TESTNET"
              ? "Connected to Stellar Testnet"
              : network === "WRONG"
                ? "Wallet is on the wrong network — switch to Stellar Testnet in your wallet settings"
                : "Cannot verify wallet network — ensure your wallet is connected and on Testnet"
          }
        >
          <span className={`h-2 w-2 rounded-full ${meta.color}`} />
          <span>{meta.label}</span>
        </div>
      )}

      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Toggle Theme"
        title={`Current mode: ${theme}. Click to toggle light/dark mode.`}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none shadow-2xs cursor-pointer"
      >
        {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
      </button>

      {!address ? (
        <Button onClick={onConnect} loading={connecting} variant="primary">
          <Wallet className="h-4 w-4" />
          Connect wallet
        </Button>
      ) : (
        <>
          {/* Balance display */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] px-3.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {loadingBalance ? (
              <Spinner className="text-slate-400" />
            ) : (
              <span
                className="tabular-nums font-mono"
                title={balance === null ? "Balance could not be loaded" : undefined}
              >
                <strong className="font-bold text-slate-900 dark:text-slate-100">
                  {balance !== null
                    ? Number(balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </strong>{" "}
                {balance !== null && (
                  <span className="text-[10px] text-slate-500 font-sans">XLM</span>
                )}
              </span>
            )}
          </div>

          {/* Account pill */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] p-1 shadow-2xs">
            <button
              onClick={handleCopy}
              title="Click to copy public key"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{shortKey(address)}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Copy className="h-3 w-3 text-slate-400 shrink-0 opacity-70 hover:opacity-100" />
              )}
            </button>
            <button
              onClick={onDisconnect}
              title="Disconnect wallet"
              aria-label="Disconnect wallet"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add Employee Form                                                          */
/* -------------------------------------------------------------------------- */
interface EmployeeFormProps {
  onAdd: (input: { address: string; name?: string; salary: string }) => void;
}

export function EmployeeForm({ onAdd }: EmployeeFormProps) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [salary, setSalary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAddr = address.trim();
    if (!isValidPublicKey(cleanAddr)) {
      setError("Must be a valid Stellar public key (starts with G and is 56 characters long).");
      return;
    }

    if (!isValidXlmAmount(salary)) {
      setError("Salary must be a positive XLM amount.");
      return;
    }

    try {
      onAdd({ address: cleanAddr, name: name.trim() || undefined, salary });
      setAddress("");
      setName("");
      setSalary("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee.");
    }
  };

  return (
    <Card className="border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#101a18]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add New Employee</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Register employee Stellar wallet for salary disbursement</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Employee Name / Role (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Alice Chen (Lead Engineer)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0b1413] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Stellar Wallet Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="G..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0b1413] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Salary (XLM) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0000001"
                min="0.0000001"
                placeholder="500"
                value={salary}
                onChange={(e) => {
                  setSalary(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 pr-12 text-sm text-slate-900 dark:text-slate-100 tabular-nums placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0b1413] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400 dark:text-slate-500">XLM</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" />
            Add to Roster
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Employee Card                                                              */
/* -------------------------------------------------------------------------- */
interface EmployeeCardProps {
  employee: Employee;
  onPay: (employee: Employee) => void;
  onRemove: (address: string) => void;
}

export function EmployeeCard({ employee, onPay, onRemove }: EmployeeCardProps) {
  const initials = employee.name
    ? employee.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "EMP";

  return (
    <Card className="flex flex-col justify-between border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#101a18] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 font-extrabold text-white text-sm shadow-2xs">
              {initials}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {employee.name || "Unnamed Employee"}
              </h4>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{shortKey(employee.address)}</p>
            </div>
          </div>
          <button
            onClick={() => onRemove(employee.address)}
            title="Remove from roster"
            aria-label={`Remove ${employee.name || "employee"} from roster`}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 transition focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50/90 dark:bg-[#0b1413] border border-slate-100 dark:border-slate-800/80 p-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Salary</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums font-mono">
            {Number(employee.salary).toLocaleString()}{" "}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">XLM</span>
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/70">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Active
        </span>

        <Button
          onClick={() => onPay(employee)}
          variant="primary"
          className="py-1.5 px-3 text-xs"
        >
          <Send className="h-3.5 w-3.5" />
          Pay Salary
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Accessible modal behavior — shared by PayModal, the disconnect confirm,    */
/* and the onboarding overlay.                                                */
/* -------------------------------------------------------------------------- */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

interface DialogFocusOptions {
  containerRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  /** Allow Escape to close. Read live so callers can guard while submitting. */
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

/**
 * Locks body scroll, moves focus into the dialog, traps Tab inside it, closes
 * on Escape, and returns focus to the previously focused element on unmount.
 * Runs once per mount — dialogs mount on open and unmount on close.
 */
export function useDialogFocus({
  containerRef,
  onClose,
  closeOnEscape = true,
  initialFocusRef,
  restoreFocus = true,
}: DialogFocusOptions) {
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  // Keep the latest callbacks without re-running the mount-only effect.
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    lastFocusRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        getFocusable(container)[0]?.focus();
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (closeOnEscapeRef.current) {
          e.stopPropagation();
          onCloseRef.current?.();
        }
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // Redirect when focus leaves the dialog (e.g. a control disabled itself).
      const inside = container.contains(active);
      if (e.shiftKey) {
        if (active === first || !inside) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !inside) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      if (restoreFocus) lastFocusRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** id of the element that names this dialog (its title). */
  labelledBy?: string;
  /** fallback label when there is no labelledBy element. */
  ariaLabel?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
}

/**
 * Portal dialog with focus capture, Tab trapping, scroll lock, Escape/backdrop
 * close, and focus restore. Content goes inside `panelClassName`.
 */
export function Modal({
  onClose,
  children,
  labelledBy,
  ariaLabel,
  closeOnEscape = true,
  closeOnBackdrop = false,
  initialFocusRef,
  restoreFocus = true,
  overlayClassName = "",
  panelClassName = "",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    containerRef: overlayRef,
    onClose,
    closeOnEscape,
    initialFocusRef,
    restoreFocus,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={overlayClassName}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={panelClassName}>{children}</div>
    </div>,
    document.body
  );
}

/* -------------------------------------------------------------------------- */
/* Pay Confirmation Modal (accessible dialog)                                 */
/* Accepts a PaymentDraft instead of Employee for general direct transfers    */
/* -------------------------------------------------------------------------- */
interface PayModalProps {
  draft: PaymentDraft;
  onClose: () => void;
  onConfirm: (draft: PaymentDraft, amount: string) => Promise<boolean>;
  balance?: string | null;
}

export function PayModal({ draft, onClose, onConfirm, balance }: PayModalProps) {
  const [amount, setAmount] = useState(draft.amount);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const handlePaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!isValidXlmAmount(amount)) {
      setModalError("Please enter a valid XLM amount.");
      return;
    }

    setSubmitting(true);
    try {
      const success = await onConfirm({ ...draft, amount }, amount);
      if (success) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate balance impact
  const balanceNum = balance ? Number(balance) : null;
  const amountNum = Number(amount);
  const remaining = balanceNum !== null ? balanceNum - amountNum : null;
  const wouldDeficit = remaining !== null && remaining < 1; // 1 XLM reserve

  return (
    <Modal
      onClose={onClose}
      labelledBy="pay-modal-title"
      closeOnEscape={!submitting}
      initialFocusRef={titleRef}
      overlayClassName="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      panelClassName="w-full max-w-md rounded-2xl bg-white dark:bg-[#121b19] p-6 shadow-xl border border-slate-200/90 dark:border-slate-800 max-h-[calc(100vh-2rem)] overflow-y-auto animate-in zoom-in-95 duration-150"
    >
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
              <Send className="h-4 w-4" />
            </div>
            <h3
              id="pay-modal-title"
              ref={titleRef}
              tabIndex={-1}
              className="text-base font-bold text-slate-900 dark:text-slate-100 outline-none"
            >
              Confirm Direct Payment
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close payment confirmation"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handlePaySubmit} className="mt-4 space-y-4">
          {modalError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 dark:bg-[#0b1413] p-4 space-y-2 border border-slate-100 dark:border-slate-800">
            {draft.label && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Recipient:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{draft.label}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Stellar Address:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px] break-all max-w-[220px] text-right">
                {draft.to}
              </span>
            </div>
            {draft.memo && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Memo:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{draft.memo}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Network:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Stellar Testnet</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Source:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{draft.source}</span>
            </div>
            {balance !== null && balance !== undefined && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Wallet Balance:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {balanceNum!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-500 dark:text-slate-400">After Payment:</span>
                  <span className={`font-mono font-bold ${wouldDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {remaining!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                  </span>
                </div>
                {wouldDeficit && (
                  <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                    ⚠ Low balance after payment (reserve ~1 XLM)
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="pay-modal-amount"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Payment Amount (XLM)
            </label>
            <div className="relative">
              <input
                id="pay-modal-amount"
                type="number"
                step="0.0000001"
                min="0.0000001"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (modalError) setModalError(null);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1413] px-3.5 py-2.5 pr-12 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400 dark:text-slate-500">XLM</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 p-3 rounded-xl">
            <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This transaction will prompt your connected wallet for signature before submitting directly to Stellar Testnet.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              <Send className="h-4 w-4" />
              Sign & Send XLM
            </Button>
          </div>
        </form>
    </Modal>
  );
}
