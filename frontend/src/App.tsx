import { useState } from "react";
import {
  WalletBar,
  EmployeeForm,
  EmployeeCard,
  PayModal,
  Button,
  Card,
} from "./components/ui";
import { ToastViewport } from "./components/ToastViewport";
import { useWallet } from "./hooks/useWallet";
import { useEmployees, RosterError } from "./hooks/useEmployees";
import { useToast } from "./hooks/useToast";
import { sendXlm, fundWithFriendbot } from "./lib/stellar";
import { EXPLORER_TX } from "./config";
import type { Employee } from "./types";
import {
  Building2,
  Users,
  Coins,
  ShieldAlert,
  Wallet,
  Zap,
  ExternalLink,
  Sparkles,
} from "lucide-react";

function App() {
  const wallet = useWallet();
  const { employees, addEmployee, removeEmployee } = useEmployees();
  const { push } = useToast();

  const [payTarget, setPayTarget] = useState<Employee | null>(null);
  const [funding, setFunding] = useState(false);

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
      push({ kind: "error", message: "Wallet not connected. Connect Freighter first." });
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between antialiased">
      <ToastViewport />

      <div>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 font-bold text-white shadow-md shadow-emerald-600/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    StellarPay
                  </h1>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60 uppercase tracking-wider">
                    Level 1
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Decentralized Payroll & Salary Distribution · Stellar Testnet
                </p>
              </div>
            </div>

            <WalletBar
              address={wallet.address}
              balance={wallet.balance}
              network={wallet.network}
              connecting={wallet.connecting}
              loadingBalance={wallet.loadingBalance}
              onConnect={wallet.connect}
              onDisconnect={wallet.disconnect}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Unconnected Hero State */}
          {!wallet.address && (
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-8 sm:p-14 text-center shadow-xs">
              <div className="mx-auto max-w-2xl">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                  <Wallet className="h-8 w-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Automate & Streamline Payroll on Stellar
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  Connect your Freighter wallet to manage employee salary disbursements, execute instant zero-fee Stellar Testnet payments, and prepare for Soroban smart contract automation.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={wallet.connect}
                    loading={wallet.connecting}
                    variant="primary"
                    className="w-full sm:w-auto px-6 py-3 text-base shadow-lg shadow-emerald-600/25"
                  >
                    <Wallet className="h-5 w-5" />
                    Connect Freighter Wallet
                  </Button>
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-2"
                  >
                    Don't have Freighter? Install here <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Feature Highlights Grid */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200/80 pt-8 text-left">
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-2xs">
                  <Zap className="h-5 w-5 text-emerald-600 mb-2" />
                  <h4 className="text-xs font-bold text-slate-900">Instant Settlement</h4>
                  <p className="text-xs text-slate-500 mt-0.5">3-5 second finality on Stellar Testnet with minimal base fee.</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-2xs">
                  <Users className="h-5 w-5 text-emerald-600 mb-2" />
                  <h4 className="text-xs font-bold text-slate-900">Employee Management</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Organize employee addresses and custom salary amounts.</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-2xs">
                  <Sparkles className="h-5 w-5 text-emerald-600 mb-2" />
                  <h4 className="text-xs font-bold text-slate-900">Soroban Ready</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Architected for smart contract deployment & bulk payments in Level 2.</p>
                </div>
              </div>
            </div>
          )}

          {/* Connected App State */}
          {wallet.address && (
            <div className="space-y-8">
              {/* Network Warning Banner */}
              {wallet.network === "WRONG" && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-xs">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <strong className="font-semibold">Wrong Network Detected:</strong> Freighter is currently not configured for Stellar Testnet. Please open Freighter settings and switch network to <strong>Testnet</strong>.
                  </div>
                </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 bg-white border-slate-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Roster Size
                    </p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">
                      {employees.filter((e) => e.active).length}
                      <span className="text-xs font-normal text-slate-500 ml-1">employees</span>
                    </p>
                  </div>
                </Card>

                <Card className="flex items-center gap-4 bg-white border-slate-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Total Monthly Payroll
                    </p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">
                      {totalPayroll.toLocaleString()}{" "}
                      <span className="text-sm font-semibold text-slate-500">XLM</span>
                    </p>
                  </div>
                </Card>

                <Card className="flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-800 shadow-md">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Employer Wallet Balance
                    </p>
                    <p className="text-2xl font-black mt-0.5">
                      {wallet.balance !== null
                        ? Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "0.00"}{" "}
                      <span className="text-sm font-normal text-slate-400">XLM</span>
                    </p>
                    <button
                      onClick={handleFundMe}
                      disabled={funding}
                      className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
                    >
                      {funding ? "Funding via Friendbot…" : "Need Testnet Funds? Click Friendbot →"}
                    </button>
                  </div>
                </Card>
              </div>

              {/* Add Employee Form */}
              <EmployeeForm onAdd={handleAddEmployee} />

              {/* Roster Section */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    Employee Payroll Roster
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {employees.length} registered
                  </span>
                </div>

                {employees.length === 0 ? (
                  <Card className="border-dashed border-slate-300 bg-white/60 p-12 text-center">
                    <Users className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-700">No employees added yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Use the form above to add employee Stellar addresses (starting with G...) to build your payroll list.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">StellarPay</span>
            <span>·</span>
            <span>Stellar Journey to Mastery Hackathon</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-800 transition"
            >
              Stellar Network
            </a>
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-800 transition"
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
    </div>
  );
}

export default App;
