// Overview dashboard — employer wallet balance, roster size, monthly payroll,
// protocol summary, and quick navigation into the three working sections.
import { ArrowRight, Coins, Cpu, Send, Users } from "lucide-react";
import { Card } from "../ui";
import type { Employee, SectionId } from "../../types";

interface OverviewSectionProps {
  employees: Employee[];
  totalPayroll: number;
  balance: string | null;
  funding: boolean;
  onFundMe: () => void;
  onNavigate: (id: SectionId) => void;
}

const QUICK_ACTIONS: Array<{
  id: SectionId;
  label: string;
  desc: string;
  icon: typeof Send;
}> = [
  {
    id: "direct",
    label: "Send Direct XLM",
    desc: "One-off testnet transfer to any G… address",
    icon: Send,
  },
  {
    id: "soroban",
    label: "Run Contract Payroll",
    desc: "On-chain roster, pause, withdraw & bulk payout",
    icon: Cpu,
  },
  {
    id: "roster",
    label: "Manage Employee Roster",
    desc: "Add or remove local payroll contacts",
    icon: Users,
  },
];

const LIFECYCLE_STEPS = [
  { num: 1, title: "BUILD", sub: "Construct XDR" },
  { num: 2, title: "SIGN", sub: "Wallet signs" },
  { num: 3, title: "SUBMIT", sub: "Broadcast to network" },
  { num: 4, title: "CONFIRM", sub: "Ledger closes (~5s)" },
  { num: 5, title: "SUCCESS", sub: "On-chain verified" },
];

export function OverviewSection({
  employees,
  totalPayroll,
  balance,
  funding,
  onFundMe,
  onNavigate,
}: OverviewSectionProps) {
  const activeCount = employees.filter((e) => e.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Machine Payments Protocol
        </span>
        <h2 className="flex flex-col gap-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100 sm:gap-2">
          <span>One request.</span>
          <span className="text-emerald-600 dark:text-emerald-400">One payment.</span>
          <span>One verifiable receipt.</span>
        </h2>
        <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
          Authorize testnet XLM at the moment of disbursement. The console exposes
          every transaction step from quote to streamed answer.
        </p>
      </div>

      {/* Employer account & payroll stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 bg-white dark:bg-[#121b19]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Roster Size
            </p>
            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {activeCount}{" "}
              <span className="text-xs font-normal text-slate-500">active</span>
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-white dark:bg-[#121b19]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-600 dark:border-teal-800/60 dark:bg-teal-950/60 dark:text-teal-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Monthly Payroll
            </p>
            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {totalPayroll.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">XLM</span>
            </p>
          </div>
        </Card>

        <Card className="flex items-center justify-between bg-emerald-50/60 shadow-xs dark:bg-[#0c2d28] border-emerald-200/80 dark:border-emerald-900/60">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Employer Wallet Balance
            </p>
            <p className="mt-0.5 text-xl font-black tabular-nums text-slate-900 dark:text-white">
              {balance !== null
                ? Number(balance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"}{" "}
              <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">
                XLM
              </span>
            </p>
            <button
              type="button"
              onClick={onFundMe}
              disabled={funding}
              className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 transition hover:text-emerald-800 disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
            >
              {funding ? "Funding via Friendbot…" : "Need Testnet Funds? Click Friendbot →"}
            </button>
          </div>
        </Card>
      </div>

      {/* Quick navigation */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
          Where to next
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate(action.id)}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-[#121b19] dark:hover:border-emerald-800 cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {action.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Protocol summary */}
      <Card className="bg-white dark:bg-[#121b19]">
        <div className="mb-4 flex items-center justify-between pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              How a payout settles
            </h3>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              MPP / Stellar testnet
            </p>
          </div>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            READY
          </span>
        </div>

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
      </Card>
    </div>
  );
}
