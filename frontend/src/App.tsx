import { useState, useEffect } from "react";
import {
  WalletBar,
  EmployeeForm,
  EmployeeCard,
  PayModal,
  Button,
  Card,
} from "./components/ui";
import { ToastViewport } from "./components/ToastViewport";
import { SorobanDashboard } from "./components/SorobanDashboard";
import { OnboardingPage } from "./components/OnboardingPage";
import { useWallet } from "./hooks/useWallet";
import { useEmployees, RosterError } from "./hooks/useEmployees";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { sendXlm, fundWithFriendbot } from "./lib/stellar";
import { setWalletKitTheme } from "./lib/wallet";
import { EXPLORER_TX } from "./config";
import type { Employee } from "./types";
import {
  Users,
  Coins,
  ArrowRight,
  Info,
} from "lucide-react";

function App() {
  const wallet = useWallet();
  const { employees, addEmployee, removeEmployee } = useEmployees();
  const { push } = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setWalletKitTheme(theme);
  }, [theme]);

  const [payTarget, setPayTarget] = useState<Employee | null>(null);
  const [funding, setFunding] = useState(false);
  const [activeTab, setActiveTab] = useState<"direct" | "soroban" | "roster">("direct");

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem("stellarpay.onboarded") !== "1";
    } catch {
      return true;
    }
  });

  const dismissOnboarding = () => {
    try {
      localStorage.setItem("stellarpay.onboarded", "1");
    } catch {
      // storage unavailable — keep in-memory only
    }
    setShowOnboarding(false);
  };

  const handleAddEmployee = (input: {
    address: string;
    name?: string;
    salary: string;
  }) => {
    try {
      addEmployee(input);
      push({
        kind: "success",
        message: `Added ${input.name || "employee"} to payroll roster.`,
      });
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof RosterError ? e.message : "Failed to add employee.",
      });
    }
  };

  const handleRemoveEmployee = (address: string) => {
    const emp = employees.find((e) => e.address === address);
    removeEmployee(address);
    push({
      kind: "info",
      message: `Removed ${emp?.name || "employee"} from roster.`,
    });
  };

  const handlePay = async (employee: Employee, amount: string): Promise<boolean> => {
    if (!wallet.address) {
      push({ kind: "error", message: "Wallet not connected. Connect your wallet first." });
      return false;
    }
    try {
      const hash = await sendXlm({
        from: wallet.address,
        to: employee.address,
        amount,
        memo: `Salary: ${employee.name || "Payroll"}`,
      });
      push({
        kind: "success",
        message: `Successfully transferred ${amount} XLM to ${
          employee.name || employee.address.slice(0, 8)
        }`,
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx on Stellar Expert ↗",
      });
      await wallet.refreshBalance(wallet.address);
      return true;
    } catch (e) {
      push({
        kind: "error",
        message:
          e instanceof Error ? e.message : "Transaction failed unexpectedly.",
      });
      return false;
    }
  };

  const handleFundMe = async () => {
    if (!wallet.address) return;
    setFunding(true);
    try {
      await fundWithFriendbot(wallet.address);
      await wallet.refreshBalance(wallet.address);
      push({
        kind: "success",
        message: "Funded account with 10,000 XLM via Friendbot!",
      });
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof Error ? e.message : "Friendbot request failed.",
      });
    } finally {
      setFunding(false);
    }
  };

  const totalPayroll = employees
    .filter((e) => e.active)
    .reduce((sum, e) => sum + Number(e.salary), 0);

  const handleConnect = async () => {
    try {
      await wallet.connect(theme);
      push({
        kind: "success",
        message: "Connected wallet successfully!",
      });
    } catch (e) {
      if (e instanceof Error && e.message.includes("cancelled")) return;
      push({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to connect wallet.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f4] dark:bg-[#0b1413] text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <ToastViewport />

      <div>
        {/* Top Header Navigation Bar (PayPerCall Style) */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#091210]/90 backdrop-blur-md transition-colors duration-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-500 font-black text-white dark:text-slate-950 text-sm shadow-xs">
                S/
              </div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                StellarPay
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                aria-label="About StellarPay"
                title="Project overview & onboarding"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition focus:outline-none shadow-2xs cursor-pointer"
              >
                <Info className="h-4 w-4" />
              </button>

              <WalletBar
                address={wallet.address}
                balance={wallet.balance}
                network={wallet.network}
                connecting={wallet.connecting}
                loadingBalance={wallet.loadingBalance}
                onConnect={handleConnect}
                onDisconnect={wallet.disconnect}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Unconnected Landing View (Matching Image 0 & Image 3!) */}
          {!wallet.address && (
            <div className="space-y-12 py-4">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                
                {/* Left Column Hero Content */}
                <div className="lg:col-span-6 space-y-6">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                    Your first salary payout takes about 60 seconds
                  </span>

                  <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
                    Payroll access, settled one request at a time.
                  </h2>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    StellarPay turns normal employee rosters into verifiable testnet XLM & Soroban smart contract transfers. There is no subscription or prepaid balance: the wallet approves the exact payout before Stellar settles.
                  </p>

                  {/* Sub-Card API Endpoint Mockup */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111c1a] p-4 font-mono text-xs shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">POST</span>
                        <span className="text-slate-700 dark:text-slate-300">/api/payroll/disburse</span>
                      </div>
                      <span className="text-slate-400">→</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 font-bold text-amber-800 dark:text-amber-400 text-[10px]">
                        200 OK
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
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
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <Button
                      onClick={() => handleConnect()}
                      loading={wallet.connecting}
                      variant="primary"
                      className="w-full sm:w-auto px-6 py-3 text-sm shadow-md"
                    >
                      Open the payment console <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      No account · testnet assets only
                    </span>
                  </div>
                </div>

                {/* Right Column Dark-Teal Protocol Preview Container */}
                <div className="lg:col-span-6 rounded-3xl bg-[#0c2d28] p-6 sm:p-8 text-white shadow-xl border border-emerald-900/40">
                  <div className="flex items-center justify-between text-xs font-bold tracking-wider uppercase text-emerald-400 mb-6 pb-3 border-b border-emerald-800/40">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Protocol preview</span>
                    </div>
                    <span className="font-mono text-emerald-500">SPP/1.0</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-8 leading-tight">
                    What happens to one payroll prompt
                  </h3>

                  <div className="space-y-6 font-sans">
                    {/* Step 1 */}
                    <div className="flex items-start gap-4 pb-4 border-b border-emerald-800/40">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">01</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Request a live roster quote</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">HTTP 200</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          The gateway binds employee salary, wallet key, and execution cycle into one transaction.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-4 pb-4 border-b border-emerald-800/40">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">02</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Authorize in your wallet</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">SIGN</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Freighter, Albedo, xBull, or another supported wallet signs the non-custodial transfer.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-4 pb-4 border-b border-emerald-800/40">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">03</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Verify on Stellar</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">PAID</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          The ledger verifies execution event, amount, recipient, and replay protection.
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">04</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Stream the receipt</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">SSE</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Only a valid proof unlocks the verified execution stream and explorer-linked receipt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connected Console View (Matching Image 1 & Image 4!) */}
          {wallet.address && (
            <div className="space-y-8">
              {/* Header Title Section */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                  Machine Payments Protocol
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex flex-col gap-1.5 sm:gap-2">
                  <span>One request.</span>
                  <span className="text-emerald-600 dark:text-emerald-400">One payment.</span>
                  <span>One verifiable receipt.</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Authorize testnet XLM at the moment of disbursement. The console exposes every transaction step from quote to streamed answer.
                </p>
              </div>

              {/* Stats & Employer Account Bar */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 bg-white dark:bg-[#111c1a]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Roster Size</p>
                    <p className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {employees.filter((e) => e.active).length} <span className="text-xs font-normal text-slate-500">active</span>
                    </p>
                  </div>
                </Card>

                <Card className="flex items-center gap-4 bg-white dark:bg-[#111c1a]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/60 shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Monthly Payroll</p>
                    <p className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {totalPayroll.toLocaleString()} <span className="text-xs font-normal text-slate-500">XLM</span>
                    </p>
                  </div>
                </Card>

                <Card className="flex items-center justify-between bg-emerald-50/60 dark:bg-[#0c2d28] border-emerald-200/80 dark:border-emerald-900/60 shadow-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Employer Wallet Balance</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                      {wallet.balance !== null
                        ? Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "0.00"}{" "}
                      <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">XLM</span>
                    </p>
                    <button
                      onClick={handleFundMe}
                      disabled={funding}
                      className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50 transition cursor-pointer"
                    >
                      {funding ? "Funding via Friendbot…" : "Need Testnet Funds? Click Friendbot →"}
                    </button>
                  </div>
                </Card>
              </div>

              {/* Console Main 2-Column Section */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                
                {/* Left Card: Request Composer (Matching Image 1) */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111c1a] p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Request composer</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Provider credentials stay in this browser</p>
                    </div>
                    <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 font-mono text-[11px] font-bold">
                      0.00001 XLM / call
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-4 text-xs font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <button
                      onClick={() => setActiveTab("direct")}
                      className={`pb-1 transition border-b-2 ${
                        activeTab === "direct"
                          ? "border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Direct XLM
                    </button>
                    <button
                      onClick={() => setActiveTab("soroban")}
                      className={`pb-1 transition border-b-2 ${
                        activeTab === "soroban"
                          ? "border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Soroban Contract
                    </button>
                    <button
                      onClick={() => setActiveTab("roster")}
                      className={`pb-1 transition border-b-2 ${
                        activeTab === "roster"
                          ? "border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Employee Roster ({employees.length})
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {activeTab === "direct" && (
                    <div className="space-y-4 pt-1">
                      <EmployeeForm onAdd={handleAddEmployee} />
                    </div>
                  )}

                  {activeTab === "soroban" && (
                    <div className="space-y-4 pt-1">
                      <SorobanDashboard userAddress={wallet.address} network={wallet.network} />
                    </div>
                  )}

                  {activeTab === "roster" && (
                    <div className="space-y-4 pt-1">
                      {employees.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">No employees in roster yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {employees.map((emp) => (
                            <EmployeeCard
                              key={emp.address}
                              employee={emp}
                              onPay={(e) => setPayTarget(e)}
                              onRemove={handleRemoveEmployee}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Card: Protocol Trace & Response Stream (Matching Image 1) */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111c1a] p-5 shadow-2xs space-y-6">
                  
                  {/* Protocol Trace Header */}
                  <div>
                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Protocol trace</h3>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">MPP / Stellar testnet</p>
                      </div>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5">
                        READY
                      </span>
                    </div>

                    {/* 8-Step Pipeline Visual Progress Bar */}
                    <div className="mt-4 grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {[
                        { num: 1, title: "ISSUED", sub: "Challenge minted" },
                        { num: 2, title: "402", sub: "Payment required" },
                        { num: 3, title: "SIGNING", sub: "Wallet authorization" },
                        { num: 4, title: "SUBMITTED", sub: "Transaction broadcast" },
                      ].map((step) => (
                        <div key={step.num} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                              {step.num}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200">{step.title}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight">{step.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-3">
                      {[
                        { num: 5, title: "CONFIRMING", sub: "Awaiting ledger close" },
                        { num: 6, title: "PAID", sub: "Proof verified" },
                        { num: 7, title: "SERVING", sub: "Upstream connected" },
                        { num: 8, title: "DONE", sub: "Receipt finalized" },
                      ].map((step) => (
                        <div key={step.num} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                              {step.num}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-slate-800 dark:text-slate-200">{step.title}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight">{step.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response Stream Console Box */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Response stream</span>
                      <span className="font-mono text-[10px] text-slate-400">text/event-stream</span>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-[#0b1413] border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-2">
                      <ArrowRight className="mx-auto h-6 w-6 text-emerald-500 rotate-45" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Your paid response will stream here.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        The receipt lands below after finalization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#091210] py-6 mt-16 text-xs text-slate-500 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">StellarPay</span>
            <span>·</span>
            <span>Machine Payments Protocol on Stellar</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Stellar Network
            </a>
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Testnet Explorer
            </a>
          </div>
        </div>
      </footer>

      {/* Pay Modal */}
      {payTarget && (
        <PayModal
          employee={payTarget}
          onClose={() => setPayTarget(null)}
          onConfirm={(emp, amt) => handlePay(emp, amt)}
        />
      )}

      {/* Project onboarding overlay (first-run or via About button) */}
      {showOnboarding && (
        <OnboardingPage
          onClose={dismissOnboarding}
          onConnect={handleConnect}
          connecting={wallet.connecting}
          walletConnected={!!wallet.address}
        />
      )}
    </div>
  );
}

export default App;
