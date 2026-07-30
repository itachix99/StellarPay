import { useState, useEffect, lazy, Suspense } from "react";
import logoSrc from "./assets/logo_lightmode.svg";
import logoSrcDark from "./assets/logo_darkmode.svg";
import {
  WalletBar,
  PayModal,
  Button,
  Card,
  Spinner,
  shortKey,
} from "./components/ui";
import { DirectXlmForm } from "./components/DirectXlmForm";
import { EmployeesSection } from "./components/EmployeesSection";
import { ToastViewport } from "./components/ToastViewport";
import { useWallet } from "./hooks/useWallet";
import { useEmployees, RosterError } from "./hooks/useEmployees";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { sendXlm, fundWithFriendbot } from "./lib/stellar";
import { setWalletKitTheme } from "./lib/wallet";
import { EXPLORER_TX } from "./config";
import type { Employee, PaymentDraft, PaymentReceipt } from "./types";
import {
  Users,
  Coins,
  ArrowRight,
  ArrowUpRight,
  Info,
  LogOut,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

// Lazy-loaded components (only rendered on specific tabs / actions)
const SorobanDashboard = lazy(() =>
  import("./components/SorobanDashboard").then((m) => ({ default: m.SorobanDashboard }))
);
const OnboardingPage = lazy(() =>
  import("./components/OnboardingPage").then((m) => ({ default: m.OnboardingPage }))
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-slate-400">
      <Spinner />
    </div>
  );
}

function App() {
  const wallet = useWallet();
  const { employees, addEmployee, removeEmployee } = useEmployees();
  const { push } = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setWalletKitTheme(theme);
  }, [theme]);

  // Payment flow state
  const [payDraft, setPayDraft] = useState<PaymentDraft | null>(null);
  const [paymentPrefill, setPaymentPrefill] = useState<{
    address: string;
    amount?: string;
    name?: string;
  } | null>(null);
  const [lastPayment, setLastPayment] = useState<PaymentReceipt | null>(null);

  const [funding, setFunding] = useState(false);
  const [activeTab, setActiveTab] = useState<"direct" | "soroban" | "roster">("direct");

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

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

  /** Pay Salary prefills the Direct XLM form and switches to the direct tab */
  const handlePaySalary = (employee: Employee) => {
    setPaymentPrefill({
      address: employee.address,
      amount: employee.salary,
      name: employee.name,
    });
    setActiveTab("direct");
  };

  /** Called when DirectXlmForm is submitted — opens PayModal */
  const handleDraftSubmit = (draft: PaymentDraft) => {
    setPayDraft(draft);
  };

  /** General payment handler that accepts any PaymentDraft */
  const handleDirectPayment = async (
    draft: PaymentDraft,
    amount: string,
  ): Promise<boolean> => {
    if (!wallet.address) {
      push({ kind: "error", message: "Wallet not connected. Connect your wallet first." });
      return false;
    }
    if (wallet.network !== "TESTNET") {
      push({
        kind: "error",
        message:
          wallet.network === "WRONG"
            ? "Wrong network in wallet. Switch to Stellar Testnet before making payments."
            : "Cannot verify wallet network. Ensure your wallet is connected to Stellar Testnet.",
      });
      return false;
    }
    try {
      const hash = await sendXlm({
        from: wallet.address,
        to: draft.to,
        amount,
        memo: draft.memo,
      });
      const receipt: PaymentReceipt = {
        txHash: hash,
        to: draft.to,
        amount,
        label: draft.label,
        memo: draft.memo,
        timestamp: Date.now(),
      };
      setLastPayment(receipt);
      push({
        kind: "success",
        message: `Successfully transferred ${amount} XLM to ${
          draft.label || shortKey(draft.to)
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

  const handleDisconnect = () => {
    setConfirmDisconnect(true);
  };

  const handleDisconnectConfirm = () => {
    wallet.disconnect();
    push({ kind: "info", message: "Wallet disconnected." });
    setConfirmDisconnect(false);
  };

  const handleDisconnectCancel = () => {
    setConfirmDisconnect(false);
  };

  // Determine if payment form should be disabled
  const paymentDisabled = !wallet.address || wallet.network !== "TESTNET";
  const paymentDisabledReason = !wallet.address
    ? "Connect your wallet first"
    : wallet.network === "WRONG"
      ? "Wrong network — switch to Stellar Testnet"
      : wallet.network === "UNKNOWN"
        ? "Cannot verify wallet network"
        : undefined;

  return (
    <div className="min-h-screen bg-[#f3f5f4] dark:bg-[#0b1413] text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <ToastViewport />

      <div>
        {/* Top Header Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b1413]/90 backdrop-blur-md transition-colors duration-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <img
                src={theme === "dark" ? logoSrcDark : logoSrc}
                alt="StellarPay"
                className="h-9 w-auto"
              />
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
                onDisconnect={handleDisconnect}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Unconnected Landing View */}
          {!wallet.address && (
            <div className="space-y-12 py-4">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">

                {/* Left Column Hero Content */}
                <div className="lg:col-span-6 space-y-6">
                  <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]">
                    Payroll access, settled one request at a time.
                  </h2>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    StellarPay turns normal employee rosters into verifiable testnet XLM & Soroban smart contract transfers. There is no subscription or prepaid balance: the wallet approves the exact payout before Stellar settles.
                  </p>

                  {/* Sub-Card API Endpoint Mockup */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121b19] p-4 font-mono text-xs shadow-2xs space-y-3">
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
                          <h4 className="text-sm font-bold">Build transaction XDR</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">BUILD</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Construct the XLM payment or Soroban contract call with source account, sequence number, fee, and memo.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-4 pb-4 border-b border-emerald-800/40">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">02</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Sign in wallet</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">SIGN</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Freighter, Albedo, xBull, or another supported wallet signs the non-custodial XDR client-side.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-4 pb-4 border-b border-emerald-800/40">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">03</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Submit to network</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">SUBMIT</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Signed XDR is broadcast to Horizon (XLM) or Soroban RPC (contract calls).
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-4 pb-4 border-b border-emerald-800/40">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">04</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Confirm on ledger</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">CONFIRM</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Stellar ledger closes (~3-5 seconds). The transaction is included and a result hash is returned.
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">05</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold">Verified on-chain</h4>
                          <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">SUCCESS</span>
                        </div>
                        <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                          Transaction hash confirmed. A verifiable explorer link is provided as receipt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connected Console View */}
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
                <Card className="flex items-center gap-4 bg-white dark:bg-[#121b19]">
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

                <Card className="flex items-center gap-4 bg-white dark:bg-[#121b19]">
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

                {/* Left Card: Payment Form or Roster */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121b19] p-5 shadow-2xs space-y-4">
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
                      onClick={() => {
                        setActiveTab("direct");
                        setPaymentPrefill(null);
                      }}
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
                      <DirectXlmForm
                        employees={employees}
                        prefill={paymentPrefill}
                        onSubmit={handleDraftSubmit}
                        disabled={paymentDisabled}
                        disabledReason={paymentDisabledReason}
                      />
                    </div>
                  )}

                  {activeTab === "soroban" && (
                    <div className="space-y-4 pt-1">
                      <Suspense fallback={<LoadingFallback />}>
                        <SorobanDashboard userAddress={wallet.address} network={wallet.network} />
                      </Suspense>
                    </div>
                  )}

                  {activeTab === "roster" && (
                    <div className="space-y-4 pt-1">
                      <EmployeesSection
                        employees={employees}
                        onAdd={handleAddEmployee}
                        onRemove={handleRemoveEmployee}
                        onPaySalary={handlePaySalary}
                      />
                    </div>
                  )}
                </div>

                {/* Right Card: Protocol Trace & Transaction Result */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121b19] p-5 shadow-2xs space-y-6">

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

                    {/* Stellar Transaction Lifecycle */}
                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                        Stellar Transaction Lifecycle
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { num: 1, title: "BUILD", sub: "Construct XDR" },
                          { num: 2, title: "SIGN", sub: "Wallet signs" },
                          { num: 3, title: "SUBMIT", sub: "Broadcast to network" },
                          { num: 4, title: "CONFIRM", sub: "Ledger closes (~5s)" },
                          { num: 5, title: "SUCCESS", sub: "On-chain verified" },
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
                  </div>

                  {/* Transaction Result Panel — shows latest payment status */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Transaction result</span>
                      <span className="font-mono text-[10px] text-slate-400">verified on-chain</span>
                    </div>

                    {lastPayment ? (
                      <div className="rounded-xl bg-slate-50 dark:bg-[#0b1413] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Payment confirmed
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Recipient:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                              {lastPayment.label || shortKey(lastPayment.to)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Address:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px] max-w-[180px] truncate">
                              {lastPayment.to}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Amount:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {Number(lastPayment.amount).toLocaleString()} XLM
                            </span>
                          </div>
                          {lastPayment.memo && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Memo:</span>
                              <span className="text-slate-700 dark:text-slate-300">{lastPayment.memo}</span>
                            </div>
                          )}
                        </div>

                        <a
                          href={EXPLORER_TX(lastPayment.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View on Stellar Expert
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 dark:bg-[#0b1413] border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-2">
                        <ArrowRight className="mx-auto h-6 w-6 text-emerald-500 rotate-45" />
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Your confirmed transaction will appear here.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          The Explorer link and hash land below after the ledger closes.
                        </p>
                      </div>
                    )}
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

      {/* Pay Modal — now accepts PaymentDraft */}
      {payDraft && (
        <PayModal
          draft={payDraft}
          balance={wallet.balance}
          onClose={() => {
            setPayDraft(null);
            // Clear prefill after payment flow completes
            setPaymentPrefill(null);
          }}
          onConfirm={(draft, amount) => handleDirectPayment(draft, amount)}
        />
      )}

      {/* Disconnect confirmation dialog */}
      {confirmDisconnect && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleDisconnectCancel}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm disconnect wallet"
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121b19] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60 shrink-0">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Disconnect wallet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to disconnect your wallet?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 justify-end">
              <Button
                onClick={handleDisconnectCancel}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisconnectConfirm}
                variant="danger"
                className="flex-1 sm:flex-none"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project onboarding overlay (first-run or via About button) */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingPage
            onClose={dismissOnboarding}
            onConnect={handleConnect}
            connecting={wallet.connecting}
            walletConnected={!!wallet.address}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
