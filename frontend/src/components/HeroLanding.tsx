// Unconnected landing view — hero value prop, protocol preview, and the
// primary "connect wallet" action. Shown in place of the sidebar console.
import { ArrowRight } from "lucide-react";
import { Button } from "./ui";

interface HeroLandingProps {
  onConnect: () => void;
  connecting?: boolean;
}

export function HeroLanding({ onConnect, connecting = false }: HeroLandingProps) {
  return (
    <div className="space-y-12 py-4">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column Hero Content */}
        <div className="space-y-6 lg:col-span-6">
          <h2 className="text-3xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
            Payroll access, settled one request at a time.
          </h2>

          <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
            StellarPay turns normal employee rosters into verifiable testnet XLM &
            Soroban smart contract transfers. There is no subscription or prepaid
            balance: the wallet approves the exact payout before Stellar settles.
          </p>

          {/* Sub-Card API Endpoint Mockup */}
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 font-mono text-xs shadow-2xs dark:border-slate-800 dark:bg-[#121b19]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">POST</span>
                <span className="text-slate-700 dark:text-slate-300">/api/payroll/disburse</span>
              </div>
              <span className="text-slate-400">→</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-400">
                200 OK
              </span>
            </div>
            <div className="space-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>X-Stellar-Network</span>
                <span className="text-slate-700 dark:text-slate-300">Testnet</span>
              </div>
              <div className="flex justify-between">
                <span>X-Stroop-Precision</span>
                <span className="text-slate-700 dark:text-slate-300">10,000,000</span>
              </div>
            </div>
          </div>

          {/* Hero Actions */}
          <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row">
            <Button
              onClick={onConnect}
              loading={connecting}
              variant="primary"
              className="w-full px-6 py-3 text-sm shadow-md sm:w-auto"
            >
              Open the payment console <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No account · testnet assets only
            </span>
          </div>
        </div>

        {/* Right Column Dark-Teal Protocol Preview Container */}
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0c2d28] p-6 text-white shadow-xl sm:p-8 lg:col-span-6">
          <div className="mb-6 flex items-center justify-between border-b border-emerald-800/40 pb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>Protocol preview</span>
            </div>
            <span className="font-mono text-emerald-500">SPP/1.0</span>
          </div>

          <h3 className="mb-8 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            What happens to one payroll prompt
          </h3>

          <div className="space-y-6 font-sans">
            {[
              {
                num: "01",
                tag: "BUILD",
                title: "Build transaction XDR",
                desc: "Construct the XLM payment or Soroban contract call with source account, sequence number, fee, and memo.",
              },
              {
                num: "02",
                tag: "SIGN",
                title: "Sign in wallet",
                desc: "Freighter, Albedo, xBull, or another supported wallet signs the non-custodial XDR client-side.",
              },
              {
                num: "03",
                tag: "SUBMIT",
                title: "Submit to network",
                desc: "Signed XDR is broadcast to Horizon (XLM) or Soroban RPC (contract calls).",
              },
              {
                num: "04",
                tag: "CONFIRM",
                title: "Confirm on ledger",
                desc: "Stellar ledger closes (~3-5 seconds). The transaction is included and a result hash is returned.",
              },
              {
                num: "05",
                tag: "SUCCESS",
                title: "Verified on-chain",
                desc: "Transaction hash confirmed. A verifiable explorer link is provided as receipt.",
              },
            ].map((step, i) => (
              <div
                key={step.num}
                className={`flex items-start gap-4 ${i < 4 ? "border-b border-emerald-800/40 pb-4" : ""}`}
              >
                <span className="mt-0.5 font-mono text-xs font-bold text-emerald-400">
                  {step.num}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">{step.title}</h4>
                    <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      {step.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-200/70">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
