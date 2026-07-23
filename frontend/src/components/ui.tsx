// UI components for StellarPay (Level 1) using lucide-react & Tailwind CSS.
import { useState, type ButtonHTMLAttributes, type ReactNode, type FormEvent } from "react";
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
} from "lucide-react";
import type { Employee } from "../types";
import { isValidPublicKey } from "../lib/stellar";

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
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm shadow-emerald-600/20",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-700 shadow-sm",
  danger:
    "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 focus-visible:ring-rose-500",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  outline:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-2xs",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: BtnProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm ${className}`}
    >
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
}

export function WalletBar({
  address,
  balance,
  network,
  connecting,
  loadingBalance,
  onConnect,
  onDisconnect,
}: WalletBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) {
    return (
      <Button onClick={onConnect} loading={connecting} variant="primary">
        <Wallet className="h-4 w-4" />
        Connect Freighter
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Network Badge */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          network === "TESTNET"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            network === "TESTNET" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        {network === "TESTNET" ? "Stellar Testnet" : "Wrong Network"}
      </span>

      {/* Balance display */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-sm font-medium text-slate-700">
        <Coins className="h-4 w-4 text-emerald-600" />
        {loadingBalance ? (
          <Spinner className="text-slate-400" />
        ) : (
          <span>
            <strong className="font-bold text-slate-900">
              {balance !== null ? Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
            </strong>{" "}
            <span className="text-xs text-slate-500 font-normal">XLM</span>
          </span>
        )}
      </div>

      {/* Account pill */}
      <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
        <button
          onClick={handleCopy}
          title="Click to copy public key"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 hover:text-emerald-600 transition"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          {shortKey(address)}
          {copied && <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>}
        </button>
        <button
          onClick={onDisconnect}
          title="Disconnect wallet"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
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

    const numSalary = Number(salary);
    if (!salary || isNaN(numSalary) || numSalary <= 0) {
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
    <Card className="border-slate-200 bg-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Add New Employee</h3>
            <p className="text-xs text-slate-500">Register employee Stellar wallet for salary disbursement</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Employee Name / Role (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Alice Chen (Lead Engineer)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-medium text-slate-700 mb-1">
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                required
              />
              <span className="absolute right-3.5 top-2 text-xs font-medium text-slate-400">XLM</span>
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
    <Card className="flex flex-col justify-between border-slate-200/90 bg-white hover:border-slate-300">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 font-bold text-white text-sm shadow-xs">
              {initials}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                {employee.name || "Unnamed Employee"}
              </h4>
              <p className="text-xs font-mono text-slate-500">{shortKey(employee.address)}</p>
            </div>
          </div>
          <button
            onClick={() => onRemove(employee.address)}
            title="Remove from roster"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <span className="text-xs font-medium text-slate-500">Monthly Salary</span>
          <span className="text-sm font-bold text-slate-900">
            {Number(employee.salary).toLocaleString()}{" "}
            <span className="text-xs text-slate-400 font-normal">XLM</span>
          </span>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          <CheckCircle2 className="h-3 w-3" /> Active
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
/* Pay Confirmation Modal                                                     */
/* -------------------------------------------------------------------------- */
interface PayModalProps {
  employee: Employee;
  onClose: () => void;
  onConfirm: (employee: Employee, amount: string) => Promise<boolean>;
}

export function PayModal({ employee, onClose, onConfirm }: PayModalProps) {
  const [amount, setAmount] = useState(employee.salary);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handlePaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setModalError("Please enter a valid salary amount.");
      return;
    }

    setSubmitting(true);
    const success = await onConfirm(employee, amount);
    setSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Send className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Confirm Direct Payment</h3>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handlePaySubmit} className="mt-4 space-y-4">
          {modalError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4 space-y-2 border border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Recipient:</span>
              <span className="font-semibold text-slate-900">{employee.name || "Unnamed"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Stellar Address:</span>
              <span className="font-mono text-slate-700">{shortKey(employee.address)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Network:</span>
              <span className="font-medium text-emerald-700">Stellar Testnet</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Payment Amount (XLM)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0000001"
                min="0.0000001"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (modalError) setModalError(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-12 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">XLM</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl">
            <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This transaction will prompt your <strong>Freighter Wallet</strong> for signature before submitting directly to Stellar Testnet.
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
            <Button type="submit" variant="primary" loading={submitting}>
              <Send className="h-4 w-4" />
              Sign & Send XLM
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
