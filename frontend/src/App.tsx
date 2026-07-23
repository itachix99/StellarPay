import { WalletBar } from "./components/ui";
import { EmployeeForm } from "./components/ui";
import { EmployeeCard } from "./components/ui";
import { PayModal } from "./components/ui";
import { Button } from "./components/ui";
import { useWallet } from "./hooks/useWallet";
import { useEmployees, RosterError } from "./hooks/useEmployees";
import { useToast } from "./hooks/useToast";
import { sendXlm, fundWithFriendbot } from "./lib/stellar";
import { EXPLORER_TX } from "./config";
import type { Employee } from "./types";
import { useState } from "react";

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
      push({ kind: "success", message: "Employee added to roster." });
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof RosterError ? e.message : "Failed to add employee.",
      });
    }
  };

  const handleRemoveEmployee = (address: string) => {
    removeEmployee(address);
    push({ kind: "info", message: "Employee removed." });
  };

  const handlePay = async (employee: Employee, amount: string) => {
    if (!wallet.address) {
      push({ kind: "error", message: "Wallet not connected." });
      return false;
    }
    try {
      const hash = await sendXlm({
        from: wallet.address,
        to: employee.address,
        amount,
      });
      push({
        kind: "success",
        message: `Sent ${amount} XLM to ${employee.name || employee.address.slice(0, 8)}…`,
        href: EXPLORER_TX(hash),
        hrefLabel: "View on Explorer ↗",
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
      push({ kind: "success", message: "Funded with 10,000 XLM via Friendbot." });
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof Error ? e.message : "Friendbot failed.",
      });
    } finally {
      setFunding(false);
    }
  };

  const totalPayroll = employees
    .filter((e) => e.active)
    .reduce((sum, e) => sum + Number(e.salary), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              StellarPay
            </h1>
            <p className="text-sm text-slate-500">
              Decentralized Payroll · Testnet
            </p>
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Not connected state */}
        {!wallet.address && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <svg
                className="h-8 w-8 text-brand-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Connect your wallet to get started
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              StellarPay uses Freighter to sign transactions on Stellar Testnet.
            </p>
            <Button
              className="mt-6"
              onClick={wallet.connect}
              loading={wallet.connecting}
            >
              Connect Freighter
            </Button>
          </div>
        )}

        {/* Connected state */}
        {wallet.address && (
          <div className="space-y-8">
            {/* Network warning */}
            {wallet.network === "WRONG" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ⚠️ Wrong network detected in Freighter. Switch to{" "}
                <strong>Testnet</strong> before sending transactions.
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Active Employees
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {employees.filter((e) => e.active).length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Total Payroll
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {totalPayroll.toFixed(2)}{" "}
                  <span className="text-base font-medium text-slate-400">
                    XLM
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Your Balance
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {wallet.balance !== null
                    ? Number(wallet.balance).toFixed(2)
                    : "—"}{" "}
                  <span className="text-base font-medium text-slate-400">
                    XLM
                  </span>
                </p>
                <button
                  onClick={handleFundMe}
                  disabled={funding}
                  className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                >
                  {funding ? "Funding…" : "Fund with Friendbot →"}
                </button>
              </div>
            </div>

            {/* Add Employee */}
            <EmployeeForm onAdd={handleAddEmployee} />

            {/* Employee List */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Employees
              </h2>
              {employees.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <p className="text-sm text-slate-500">
                    No employees yet. Add one above to get started.
                  </p>
                </div>
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
