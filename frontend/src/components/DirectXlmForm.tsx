// Direct XLM transfer form — sends XLM to any Stellar address.
// Includes an optional employee-roster picker that prefills the form fields
// without modifying the roster. The form never adds or removes employees.
import { useState, useEffect, useRef, type FormEvent } from "react";
import type { Employee, PaymentDraft } from "../types";
import { isValidPublicKey, isValidXlmAmount } from "../lib/stellar";
import { Button, Card, shortKey } from "./ui";
import {
  Send,
  Users,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

interface DirectXlmFormProps {
  employees: Employee[];
  onSubmit: (draft: PaymentDraft) => void;
  prefill?: { address: string; amount?: string; name?: string } | null;
  disabled?: boolean;
  disabledReason?: string;
}

export function DirectXlmForm({
  employees,
  onSubmit,
  prefill,
  disabled,
  disabledReason,
}: DirectXlmFormProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  // Apply prefill values (from "Pay Salary" action)
  useEffect(() => {
    if (!prefill) return;
    setAddress(prefill.address);
    if (prefill.amount) setAmount(prefill.amount);
    if (prefill.name) setMemo(`Salary: ${prefill.name}`);
    setSelectedEmployee("");
    setFormError(null);
    // The amount input is always mounted (the form stays mounted while hidden),
    // so focus it directly once the values land — no timer race.
    document.getElementById("dxlm-amount")?.focus();
  }, [prefill]);

  // Handle roster picker change — prefills form fields only
  const handleRosterSelect = (empAddress: string) => {
    setSelectedEmployee(empAddress);
    if (!empAddress) return;

    const emp = employees.find((e) => e.address === empAddress);
    if (emp) {
      setAddress(emp.address);
      setAmount(emp.salary);
      setMemo(emp.name ? `Salary: ${emp.name}` : "");
      setFormError(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (disabled) {
      setFormError(disabledReason || "Form is currently disabled.");
      return;
    }

    const cleanAddr = address.trim();
    if (!isValidPublicKey(cleanAddr)) {
      setFormError("Invalid Stellar address. Must be a valid G... public key.");
      return;
    }

    if (!isValidXlmAmount(amount)) {
      setFormError("Invalid amount. Must be a positive XLM amount (max 7 decimals).");
      return;
    }

    const draft: PaymentDraft = {
      to: cleanAddr,
      amount: amount.trim(),
      memo: memo.trim() || undefined,
      label: memo.trim() || undefined,
      source: selectedEmployee ? "roster" : "direct",
    };

    onSubmit(draft);
  };

  const activeEmployees = employees.filter((e) => e.active);

  return (
    <Card className="border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#101a18]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Direct XLM Transfer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Send XLM to any Stellar address on Testnet
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* Roster Picker — only prefills, never modifies roster */}
        {activeEmployees.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quick-select from Employee Roster{" "}
              <span className="text-slate-400 dark:text-slate-500 font-normal">
                (prefills form, does not modify roster)
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedEmployee}
                onChange={(e) => handleRosterSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 pr-8 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition appearance-none"
                aria-label="Select employee to prefill form"
              >
                <option value="">— Select employee to prefill —</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.address} value={emp.address}>
                    {emp.name || shortKey(emp.address)} — {Number(emp.salary).toLocaleString()} XLM
                  </option>
                ))}
              </select>
              <Users className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {/* Recipient Address */}
          <div>
            <label htmlFor="dxlm-address" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Stellar Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="dxlm-address"
              ref={addressRef}
              type="text"
              placeholder="G..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (formError) setFormError(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0b1413] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="dxlm-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (XLM) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="dxlm-amount"
                type="number"
                step="0.0000001"
                min="0.0000001"
                placeholder="100"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 pr-12 text-sm text-slate-900 dark:text-slate-100 tabular-nums placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0b1413] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
                XLM
              </span>
            </div>
          </div>

          {/* Optional Memo */}
          <div>
            <label htmlFor="dxlm-memo" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Memo / Description (Optional)
            </label>
            <input
              id="dxlm-memo"
              type="text"
              placeholder="e.g. Payment for services"
              maxLength={28}
              value={memo}
              onChange={(e) => {
                setMemo(e.target.value);
                if (formError) setFormError(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0b1413] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Optional text memo (max 28 chars). Included as a Stellar memo on the transaction.
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 p-3 rounded-xl">
          <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            XLM transfers go directly to the recipient on Stellar Testnet. Your wallet
            must be connected and on Testnet. A confirmation dialog will show before
            the transaction is signed.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={disabled}
            title={disabledReason}
          >
            <Send className="h-4 w-4" />
            Review & Send XLM
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
