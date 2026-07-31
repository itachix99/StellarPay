import { useState, useEffect, lazy, Suspense } from "react";
import { Button, PayModal, shortKey } from "./components/ui";
import { ToastViewport } from "./components/ToastViewport";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { AppShell } from "./components/layout/AppShell";
import { OverviewSection } from "./components/sections/OverviewSection";
import { DirectXlmSection } from "./components/sections/DirectXlmSection";
import { SorobanSection } from "./components/sections/SorobanSection";
import { EmployeeRosterSection } from "./components/sections/EmployeeRosterSection";
import { HeroLanding } from "./components/HeroLanding";
import { useWallet } from "./hooks/useWallet";
import { useEmployees, RosterError } from "./hooks/useEmployees";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useSidebar } from "./hooks/useSidebar";
import { sendXlm, fundWithFriendbot } from "./lib/stellar";
import { setWalletKitTheme } from "./lib/wallet";
import { EXPLORER_TX } from "./config";
import type { Employee, PaymentDraft, PaymentReceipt } from "./types";
import { LogOut } from "lucide-react";

// Lazy-loaded overlay (only rendered on demand)
const OnboardingPage = lazy(() =>
  import("./components/OnboardingPage").then((m) => ({ default: m.OnboardingPage }))
);

function App() {
  const wallet = useWallet();
  const { employees, addEmployee, removeEmployee } = useEmployees();
  const { push } = useToast();
  const { theme, toggleTheme } = useTheme();
  const sidebar = useSidebar();

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

  /** Pay Salary prefills the Direct XLM form and switches to the Direct section */
  const handlePaySalary = (employee: Employee) => {
    setPaymentPrefill({
      address: employee.address,
      amount: employee.salary,
      name: employee.name,
    });
    sidebar.select("direct");
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
    if (!wallet.address) {
      push({ kind: "error", message: "Connect a wallet first to fund it via Friendbot." });
      return;
    }
    setFunding(true);
    try {
      const result = await fundWithFriendbot(wallet.address);
      await wallet.refreshBalance(wallet.address);
      push(
        result === "already-funded"
          ? { kind: "info", message: "Your testnet account already has funds." }
          : { kind: "success", message: "Funded account with 10,000 XLM via Friendbot!" },
      );
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

  const connected = !!wallet.address;

  return (
    <div className="min-h-screen bg-[#f3f5f4] font-sans text-slate-900 antialiased transition-colors duration-200 selection:bg-emerald-500 selection:text-white dark:bg-[#0b1413] dark:text-slate-100 flex flex-col justify-between">
      <ToastViewport />

      <div className="flex min-h-screen flex-col">
        <TopBar
          theme={theme}
          onToggleTheme={toggleTheme}
          onAbout={() => setShowOnboarding(true)}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleDrawer={sidebar.toggleDrawer}
          drawerOpen={sidebar.drawerOpen}
          showMenuButton={connected}
          walletAddress={wallet.address}
          walletBalance={wallet.balance}
          walletNetwork={wallet.network}
          walletConnecting={wallet.connecting}
          walletLoadingBalance={wallet.loadingBalance}
        />

        <AppShell
          sidebar={
            connected ? (
              <Sidebar
                activeSection={sidebar.activeSection}
                onSelect={sidebar.select}
                collapsed={sidebar.collapsed}
                onToggleCollapsed={sidebar.toggleCollapsed}
                drawerOpen={sidebar.drawerOpen}
                onCloseDrawer={sidebar.closeDrawer}
                rosterCount={employees.length}
              />
            ) : undefined
          }
        >
          {connected ? (
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              {/* All sections stay mounted so partially entered form values and
                  contract state survive navigation; inactive ones are hidden. */}
              <div
                hidden={sidebar.activeSection !== "overview"}
                data-testid="section-overview"
              >
                <OverviewSection
                  employees={employees}
                  totalPayroll={totalPayroll}
                  balance={wallet.balance}
                  funding={funding}
                  onFundMe={handleFundMe}
                  onNavigate={sidebar.select}
                />
              </div>

              <div hidden={sidebar.activeSection !== "direct"} data-testid="section-direct">
                <DirectXlmSection
                  employees={employees}
                  prefill={paymentPrefill}
                  onDraftSubmit={handleDraftSubmit}
                  disabled={paymentDisabled}
                  disabledReason={paymentDisabledReason}
                  lastPayment={lastPayment}
                />
              </div>

              <div hidden={sidebar.activeSection !== "soroban"} data-testid="section-soroban">
                <SorobanSection userAddress={wallet.address} network={wallet.network} />
              </div>

              <div hidden={sidebar.activeSection !== "roster"} data-testid="section-roster">
                <EmployeeRosterSection
                  employees={employees}
                  onAdd={handleAddEmployee}
                  onRemove={handleRemoveEmployee}
                  onPaySalary={handlePaySalary}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
              <HeroLanding onConnect={handleConnect} connecting={wallet.connecting} />
            </div>
          )}
        </AppShell>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-[#091210] dark:text-slate-400">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
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
                className="transition hover:text-slate-800 dark:hover:text-slate-200"
              >
                Stellar Network
              </a>
              <a
                href="https://stellar.expert/explorer/testnet"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-slate-800 dark:hover:text-slate-200"
              >
                Testnet Explorer
              </a>
            </div>
          </div>
        </footer>
      </div>

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
            className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#121b19]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-400">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Disconnect wallet
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to disconnect your wallet?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
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
            walletConnected={connected}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
