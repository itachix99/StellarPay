import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  Address,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import {
  invokeContractCall,
  fetchContractAdmin,
  fetchContractCycle,
  xlmToStroops,
  NATIVE_SAC_TESTNET,
} from "../lib/soroban";
import { isValidPublicKey } from "../lib/stellar";
import { useToast } from "../hooks/useToast";
import { Button, Card, shortKey } from "./ui";
import {
  Cpu,
  Shield,
  ShieldCheck,
  PlusCircle,
  Play,
  RefreshCw,
  AlertCircle,
  Coins,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { EXPLORER_TX } from "../config";

interface SorobanDashboardProps {
  userAddress: string | null;
  network?: string;
}

export function SorobanDashboard({ userAddress }: SorobanDashboardProps) {
  const { push } = useToast();

  const [contractId, setContractId] = useState(
    import.meta.env.VITE_SOROBAN_CONTRACT_ID || ""
  );
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [cycle, setCycle] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Contract Employee Input Form State
  const [empAddress, setEmpAddress] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Status Log / Event Stream
  const [logs, setLogs] = useState<Array<{ id: number; msg: string; time: string; txHash?: string }>>([]);

  const addLog = (msg: string, txHash?: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Date.now(), msg, time, txHash }, ...prev]);
  };

  const refreshContractState = useCallback(async () => {
    if (!contractId || !isValidPublicKey(contractId)) return;
    setLoading(true);
    try {
      const admin = await fetchContractAdmin(contractId);
      const cyc = await fetchContractCycle(contractId);
      setAdminAddress(admin);
      setCycle(cyc);
    } catch {
      // Contract might not be initialized yet
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (contractId) {
      refreshContractState();
    }
  }, [contractId, refreshContractState]);

  const isAdmin = userAddress && adminAddress && userAddress === adminAddress;

  // Initialize Contract
  const handleInitialize = async () => {
    if (!userAddress || !contractId) return;
    setSubmitting(true);
    try {
      const args = [new Address(userAddress).toScVal()];
      const hash = await invokeContractCall({
        contractId,
        method: "initialize",
        args,
        signerAddress: userAddress,
      });
      push({
        kind: "success",
        message: "Soroban Payroll Contract initialized!",
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx ↗",
      });
      addLog("Contract Initialized with Admin " + shortKey(userAddress), hash);
      await refreshContractState();
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof Error ? e.message : "Initialization failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Add Employee to Contract
  const handleAddEmployeeContract = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!userAddress) {
      setFormError("Wallet not connected.");
      return;
    }
    if (!contractId) {
      setFormError("Contract ID is missing.");
      return;
    }

    const cleanAddr = empAddress.trim();
    if (!isValidPublicKey(cleanAddr)) {
      setFormError("Invalid Stellar Address.");
      return;
    }

    let stroops: bigint;
    try {
      stroops = xlmToStroops(empSalary);
    } catch {
      setFormError("Invalid salary amount.");
      return;
    }

    setSubmitting(true);
    try {
      const args = [
        new Address(cleanAddr).toScVal(),
        nativeToScVal(stroops, { type: "i128" }),
      ];
      const hash = await invokeContractCall({
        contractId,
        method: "add_employee",
        args,
        signerAddress: userAddress,
      });
      push({
        kind: "success",
        message: `Added employee to smart contract on Testnet!`,
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx ↗",
      });
      addLog(`Added Employee ${shortKey(cleanAddr)} (${empSalary} XLM)`, hash);
      setEmpAddress("");
      setEmpSalary("");
      await refreshContractState();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add employee.");
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Bulk Smart Contract Payroll
  const handleExecutePayroll = async () => {
    if (!userAddress || !contractId) return;
    setSubmitting(true);
    try {
      const args = [new Address(NATIVE_SAC_TESTNET).toScVal()];
      const hash = await invokeContractCall({
        contractId,
        method: "pay_salaries",
        args,
        signerAddress: userAddress,
      });
      push({
        kind: "success",
        message: `Executed Soroban smart contract payroll cycle #${cycle + 1}!`,
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx ↗",
      });
      addLog(`Executed Smart Contract Payroll Cycle #${cycle + 1}`, hash);
      await refreshContractState();
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof Error ? e.message : "Payroll execution failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-200/60 bg-gradient-to-b from-white to-emerald-50/20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 font-bold text-white shadow-md shadow-emerald-600/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Soroban Smart Contract Payroll
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Level 2
              </span>
            </div>
            <p className="text-xs text-slate-500">
              On-chain automated roster, access control & bulk payout execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="py-1.5 px-3 text-xs"
            onClick={refreshContractState}
            loading={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Contract
          </Button>
        </div>
      </div>

      {/* Contract Configuration Bar */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="sm:col-span-8">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Contract ID (Stellar Testnet C...)
          </label>
          <input
            type="text"
            placeholder="e.g. C..."
            value={contractId}
            onChange={(e) => setContractId(e.target.value.trim())}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="sm:col-span-4 flex items-center justify-between gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4">
          <div>
            <span className="block text-[10px] font-medium text-slate-400">Payroll Cycle</span>
            <span className="text-lg font-black text-slate-900">#{cycle}</span>
          </div>
          <div>
            <span className="block text-[10px] font-medium text-slate-400">Admin Role</span>
            {adminAddress ? (
              isAdmin ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> You (Admin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Shield className="h-3.5 w-3.5 text-slate-400" /> {shortKey(adminAddress)}
                </span>
              )
            ) : (
              <span className="text-xs text-amber-600 font-medium">Uninitialized</span>
            )}
          </div>
        </div>
      </div>

      {/* If contract is not deployed/initialized */}
      {!adminAddress && contractId && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Contract is deployed but not initialized yet. Initialize to claim admin rights.</span>
          </div>
          <Button
            variant="primary"
            className="py-1.5 px-3 text-xs"
            onClick={handleInitialize}
            loading={submitting}
          >
            Initialize Contract
          </Button>
        </div>
      )}

      {/* Roster & Contract Actions */}
      <div className="mt-6 space-y-6">
        {/* Add Employee Form for Smart Contract */}
        {isAdmin && (
          <form onSubmit={handleAddEmployeeContract} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4 text-emerald-600" />
              Add Employee to On-Chain Smart Contract Roster
            </h4>

            {formError && (
              <div className="p-2 text-xs text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  placeholder="Stellar Public Key (G...)"
                  value={empAddress}
                  onChange={(e) => setEmpAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="number"
                  step="0.0000001"
                  placeholder="Salary (XLM)"
                  value={empSalary}
                  onChange={(e) => setEmpSalary(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" className="w-full py-2 text-xs" loading={submitting}>
                  Add On-Chain
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Execute Contract Bulk Payroll */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-400" />
              <h4 className="text-base font-bold">Trigger On-Chain Bulk Payroll</h4>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Soroban smart contract iterates through all active employees and transfers XLM salaries automatically.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full sm:w-auto px-6 py-3 text-sm shadow-lg shadow-emerald-500/30"
            onClick={handleExecutePayroll}
            loading={submitting}
            disabled={!isAdmin || submitting}
          >
            <Coins className="h-4 w-4" />
            Execute Cycle #{cycle + 1} Payroll
          </Button>
        </div>

        {/* Event Logs & Execution Feed */}
        {logs.length > 0 && (
          <div className="bg-slate-950 rounded-2xl p-4 text-emerald-400 font-mono text-xs border border-slate-800">
            <h4 className="text-slate-400 text-[11px] uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Soroban Contract Execution Stream
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                  {log.txHash && (
                    <a
                      href={EXPLORER_TX(log.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                    >
                      Tx Hash <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
