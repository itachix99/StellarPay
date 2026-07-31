// Direct XLM section — the one-off transfer form alongside the transaction
// lifecycle trace and the most recent payment receipt.
import { ArrowRight, ArrowUpRight, CheckCircle2, ExternalLink } from "lucide-react";
import { DirectXlmForm } from "../DirectXlmForm";
import { Card, shortKey } from "../ui";
import { EXPLORER_TX } from "../../config";
import type { Employee, PaymentDraft, PaymentReceipt } from "../../types";

interface DirectXlmSectionProps {
  employees: Employee[];
  prefill?: { address: string; amount?: string; name?: string } | null;
  onDraftSubmit: (draft: PaymentDraft) => void;
  disabled?: boolean;
  disabledReason?: string;
  lastPayment: PaymentReceipt | null;
}

const LIFECYCLE_STEPS = [
  { num: 1, title: "BUILD", sub: "Construct XDR" },
  { num: 2, title: "SIGN", sub: "Wallet signs" },
  { num: 3, title: "SUBMIT", sub: "Broadcast to network" },
  { num: 4, title: "CONFIRM", sub: "Ledger closes (~5s)" },
  { num: 5, title: "SUCCESS", sub: "On-chain verified" },
];

export function DirectXlmSection({
  employees,
  prefill,
  onDraftSubmit,
  disabled,
  disabledReason,
  lastPayment,
}: DirectXlmSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          Direct XLM Transfers
        </h2>
        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
          Send testnet XLM to any Stellar address. Optional employee picker prefills
          the form from your local roster without touching it.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Payment form */}
        <div className="lg:col-span-6">
          <DirectXlmForm
            employees={employees}
            prefill={prefill}
            onSubmit={onDraftSubmit}
            disabled={disabled}
            disabledReason={disabledReason}
          />
        </div>

        {/* Lifecycle + transaction result */}
        <div className="space-y-6 lg:col-span-6">
          <Card className="bg-white dark:bg-[#121b19]">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Protocol trace
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  MPP / Stellar testnet
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                  disabled
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
                title={disabled ? (disabledReason ?? "Payment unavailable") : undefined}
              >
                {disabled ? "UNAVAILABLE" : "READY"}
              </span>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-2 dark:border-slate-800">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Stellar Transaction Lifecycle
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {LIFECYCLE_STEPS.map((step) => (
                  <div key={step.num} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {step.num}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                        {step.title}
                      </span>
                    </div>
                    <p className="text-[9px] leading-tight text-slate-400">{step.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#121b19]">
            <div className="flex items-center justify-between pb-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Transaction result
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {lastPayment ? "verified on-chain" : "awaiting confirmation"}
              </span>
            </div>

            {lastPayment ? (
              <div className="mt-2 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0b1413]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Payment confirmed
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Recipient:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {lastPayment.label || shortKey(lastPayment.to)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Address:</span>
                    <span className="max-w-[180px] truncate font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {lastPayment.to}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Amount:</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {Number(lastPayment.amount).toLocaleString()} XLM
                    </span>
                  </div>
                  {lastPayment.memo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Memo:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {lastPayment.memo}
                      </span>
                    </div>
                  )}
                </div>

                <a
                  href={EXPLORER_TX(lastPayment.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Stellar Expert
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="mt-2 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-[#0b1413]">
                <ArrowRight className="mx-auto h-6 w-6 rotate-45 text-emerald-500" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Your confirmed transaction will appear here.
                </p>
                <p className="text-[11px] text-slate-400">
                  The Explorer link and hash land below after the ledger closes.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
