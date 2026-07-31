import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import {
  Address,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import {
  invokeContractCall,
  fetchContractAdmin,
  fetchContractCycle,
  fetchIsPaused,
  fetchUnpaidPayroll,
  subscribeToContractEvents,
  checkContractInterface,
  xlmToStroops,
  stroopsToXlm,
  NATIVE_SAC_TESTNET,
} from "../lib/soroban";
import type { ContractEvent } from "../types";
import { isValidPublicKey, isValidContractId, parsePositiveXlm } from "../lib/stellar";
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
  ArrowUpRight,
  Terminal,
  Pause,
  PlayCircle,
  Banknote,
  Radio,
  WifiOff,
} from "lucide-react";
import { EXPLORER_TX } from "../config";

interface SorobanDashboardProps {
  userAddress: string | null;
  network?: string;
}

export function SorobanDashboard({ userAddress, network }: SorobanDashboardProps) {
  const { push } = useToast();

  const [contractId, setContractId] = useState(
    import.meta.env.VITE_SOROBAN_CONTRACT_ID || ""
  );
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [cycle, setCycle] = useState<number>(0);
  const [paused, setPaused] = useState(false);
  const [unpaidXlm, setUnpaidXlm] = useState<string>("0.0000");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  // ABI compatibility guard
  const [compatChecked, setCompatChecked] = useState(false);
  const [compatMessage, setCompatMessage] = useState<string | null>(null);
  const [compatOk, setCompatOk] = useState(false);

  // Contract Employee Input Form State
  const [empAddress, setEmpAddress] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Withdraw form
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Status Log / Event Stream
  const [logs, setLogs] = useState<Array<{ id: number | string; msg: string; time: string; txHash?: string }>>([]);

  // Live event streaming state — honest subscription health, not event arrival.
  const [streamStatus, setStreamStatus] = useState<
    "idle" | "connecting" | "live" | "error"
  >("idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamRetryKey, setStreamRetryKey] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const addLog = (msg: string, txHash?: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Date.now(), msg, time, txHash }, ...prev]);
  };

  /** Format a contract event into a human-readable log message. */
  const formatEventMessage = (ev: ContractEvent): string => {
    const emp = ev.employee ? shortKey(ev.employee) : "";
    const amount = ev.amount != null ? stroopsToXlm(ev.amount) : "";
    switch (ev.type) {
      case "sal_paid":
        return `💰 Salary Paid: ${emp} received ${amount} XLM`;
      case "emp_add":
        return `➕ Employee Added: ${emp} (${amount} XLM salary)`;
      case "emp_rm":
        return `🗑 Employee Removed: ${emp}`;
      case "emp_upd":
        return `✏️ Salary Updated: ${emp} → ${amount} XLM`;
      case "emp_act":
        return ev.active ? `✅ Employee Activated: ${emp}` : `⛔ Employee Deactivated: ${emp}`;
      case "pause":
        return ev.active ? `⏸️ Contract Paused` : `▶️ Contract Unpaused`;
      case "withdraw":
        return `💸 Withdrawn: ${amount} XLM → ${emp}`;
      case "cyc_done":
        return `✅ Cycle #${ev.cycle ?? "?"} Payroll Done (${amount} XLM total)`;
      case "cyc_next":
        return `🔄 Advanced to Cycle #${ev.cycle ?? "?"}`;
      case "adm_xfer":
        return `👑 Admin Transferred → ${ev.newAdmin ? shortKey(ev.newAdmin) : "?"}`;
      default:
        return `📡 Event: ${ev.type}`;
    }
  };

  // Subscribe to live contract events. The status reflects subscription health,
  // not whether an event has happened yet: a healthy poll is "live" even when
  // there is nothing new to show.
  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!contractId || !isValidContractId(contractId)) {
      setStreamStatus("idle");
      setStreamError(null);
      return;
    }

    setStreamStatus("connecting");
    setStreamError(null);

    const unsub = subscribeToContractEvents({
      contractId,
      pollIntervalMs: 5000,
      onPollSuccess: () => setStreamStatus("live"),
      onEvents: (events) => {
        setStreamStatus("live");
        for (const ev of events) {
          const msg = formatEventMessage(ev);
          const time = new Date(ev.timestamp).toLocaleTimeString();
          setLogs((prev) => {
            // Deduplicate by event ID
            if (prev.some((l) => String(l.id) === ev.id)) return prev;
            return [{ id: ev.id, msg, time }, ...prev];
          });
        }
      },
      onError: (err) => {
        setStreamStatus("error");
        setStreamError(
          err instanceof Error
            ? err.message
            : "Contract event stream unavailable.",
        );
      },
    });

    unsubscribeRef.current = unsub;

    return () => {
      unsub();
      unsubscribeRef.current = null;
      setStreamStatus("idle");
      setStreamError(null);
    };
  }, [contractId, streamRetryKey]);

  // Check ABI compatibility when contractId changes
  useEffect(() => {
    if (!contractId || !isValidContractId(contractId)) {
      setCompatChecked(false);
      setCompatMessage(null);
      setCompatOk(false);
      return;
    }

    let cancelled = false;
    setCompatChecked(false);
    checkContractInterface(contractId).then((result) => {
      if (cancelled) return;
      setCompatChecked(true);
      setCompatOk(result.compatible);
      setCompatMessage(result.message);
    });

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const refreshContractState = useCallback(async () => {
    if (!contractId || !isValidContractId(contractId)) return;
    setLoading(true);
    try {
      const [admin, cyc, isPaused, unpaid] = await Promise.all([
        fetchContractAdmin(contractId),
        fetchContractCycle(contractId),
        fetchIsPaused(contractId),
        fetchUnpaidPayroll(contractId),
      ]);
      setAdminAddress(admin);
      setCycle(cyc);
      setPaused(isPaused);
      setUnpaidXlm(stroopsToXlm(unpaid));
      setStateError(null);
    } catch {
      // Contract might not be initialized yet, but an RPC failure should not
      // look like a healthy sync — surface it instead of silently swallowing it.
      setStateError(
        "Could not refresh on-chain contract state. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (contractId) {
      refreshContractState();
    }
  }, [contractId, refreshContractState]);

  const contractIdValid = !contractId || isValidContractId(contractId);
  const isAdmin = !!(userAddress && adminAddress && userAddress === adminAddress);

  // Initialize Contract with pinned native SAC token
  const handleInitialize = async () => {
    if (!userAddress || !contractId) return;
    setSubmitting(true);
    try {
      const args = [
        new Address(userAddress).toScVal(),
        new Address(NATIVE_SAC_TESTNET).toScVal(),
      ];
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
    if (paused) {
      setFormError("Contract is paused. Unpause before adding employees.");
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

  // Execute Bulk Smart Contract Payroll (uses stored token; no free token arg)
  const handleExecutePayroll = async () => {
    if (!userAddress || !contractId) return;
    if (paused) {
      push({ kind: "error", message: "Contract is paused. Unpause before running payroll." });
      return;
    }
    setSubmitting(true);
    try {
      const hash = await invokeContractCall({
        contractId,
        method: "pay_salaries",
        args: [],
        signerAddress: userAddress,
      });
      push({
        kind: "success",
        message: `Executed Soroban smart contract payroll for cycle #${cycle}!`,
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx ↗",
      });
      addLog(`Executed Smart Contract Payroll Cycle #${cycle}`, hash);

      // Advance to next cycle (the contract blocks this while unpaid remain).
      // This is a separate step: if it fails, payroll still paid out, so the
      // message must say so rather than claiming the whole run failed.
      try {
        const cycleHash = await invokeContractCall({
          contractId,
          method: "next_cycle",
          args: [],
          signerAddress: userAddress,
        });
        addLog(`Advanced payroll cycle`, cycleHash);
      } catch (e) {
        push({
          kind: "info",
          message: `Payroll paid out, but advancing the cycle failed: ${
            e instanceof Error ? e.message : "unpaid salaries remain"
          }. Unpaid salaries may remain — top up the contract and try again.`,
        });
      }

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

  const handleTogglePause = async () => {
    if (!userAddress || !contractId) return;
    setSubmitting(true);
    try {
      const next = !paused;
      const hash = await invokeContractCall({
        contractId,
        method: "set_paused",
        args: [xdr.ScVal.scvBool(next)],
        signerAddress: userAddress,
      });
      push({
        kind: "success",
        message: next ? "Contract paused." : "Contract unpaused.",
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx ↗",
      });
      addLog(next ? "Contract paused" : "Contract unpaused", hash);
      await refreshContractState();
    } catch (e) {
      push({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to update pause state.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    if (!userAddress || !contractId) return;

    const to = withdrawTo.trim() || userAddress;
    if (!isValidPublicKey(to)) {
      push({ kind: "error", message: "Withdraw destination must be a valid G... address." });
      return;
    }

    let stroops: bigint;
    try {
      parsePositiveXlm(withdrawAmount);
      stroops = xlmToStroops(withdrawAmount);
    } catch {
      push({ kind: "error", message: "Enter a valid positive withdraw amount." });
      return;
    }

    setSubmitting(true);
    try {
      const hash = await invokeContractCall({
        contractId,
        method: "withdraw",
        args: [
          new Address(to).toScVal(),
          nativeToScVal(stroops, { type: "i128" }),
        ],
        signerAddress: userAddress,
      });
      push({
        kind: "success",
        message: `Withdrew ${withdrawAmount} XLM from contract.`,
        href: EXPLORER_TX(hash),
        hrefLabel: "View Tx ↗",
      });
      addLog(`Withdrew ${withdrawAmount} XLM → ${shortKey(to)}`, hash);
      setWithdrawAmount("");
      await refreshContractState();
    } catch (err) {
      push({
        kind: "error",
        message: err instanceof Error ? err.message : "Withdraw failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#121b19]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 font-bold text-white shadow-xs shadow-emerald-600/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Soroban Smart Contract Payroll
              </h3>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/80">
                Level 2
              </span>
              {paused && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wider border border-amber-200 dark:border-amber-800/80">
                  Paused
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              On-chain roster, pause, withdraw & bulk payout execution
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

      {/* Network warning banner */}
      {network && network !== "TESTNET" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>
            {network === "WRONG"
              ? "Your wallet is on the wrong network. Soroban contract actions require Stellar Testnet."
              : "Unable to verify your wallet network. Ensure your wallet is connected to Stellar Testnet before using Soroban features."}
          </span>
        </div>
      )}

      {/* Contract Configuration Bar */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center bg-white dark:bg-[#14201e] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="sm:col-span-8">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Deployed Soroban Contract ID (Stellar Testnet C...)
          </label>
          <input
            type="text"
            placeholder="e.g. C..."
            value={contractId}
            onChange={(e) => setContractId(e.target.value.trim())}
            className={`w-full rounded-xl border ${!contractIdValid ? "border-rose-300 dark:border-rose-700" : "border-slate-200 dark:border-slate-800"} bg-slate-50/80 dark:bg-slate-950 px-3.5 py-2 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
          />
          {!contractIdValid && contractId && (
            <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              Invalid contract ID format. Must be a valid Stellar contract ID (C...).
            </p>
          )}
        </div>

        <div className="sm:col-span-4 flex items-center justify-between gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Payroll Cycle</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">#{cycle}</span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Unpaid {unpaidXlm} XLM
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Admin Access</span>
            {adminAddress ? (
              isAdmin ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> You (Admin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                  <Shield className="h-3.5 w-3.5 text-slate-400" /> {shortKey(adminAddress)}
                </span>
              )
            ) : (
              <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">Uninitialized</span>
            )}
          </div>
        </div>
      </div>

      {/* Contract state refresh failure — do not let a failed sync look healthy */}
      {stateError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{stateError}</span>
        </div>
      )}

      {/* ABI Compatibility Warning */}
      {contractId && contractIdValid && compatChecked && !compatOk && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{compatMessage ?? "Configured contract is an incompatible payroll version. Deploy or configure the current contract."}</span>
        </div>
      )}

      {/* Compatibility Check Pending */}
      {contractId && contractIdValid && !compatChecked && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-3 text-xs font-medium text-slate-600 dark:text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          <span>Checking contract compatibility...</span>
        </div>
      )}

      {/* If contract is not deployed/initialized */}
      {!adminAddress && contractId && contractIdValid && compatChecked && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 p-4 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {compatOk
                ? "Contract is deployed but not initialized yet. Initializes admin + pins native SAC token."
                : "Contract state could not be verified. Resolve the compatibility issue above before initializing."}
            </span>
          </div>
          <Button
            variant="primary"
            className="py-1.5 px-3 text-xs"
            onClick={handleInitialize}
            disabled={!compatOk}
            loading={submitting}
          >
            Initialize Contract
          </Button>
        </div>
      )}

      {/* Roster & Contract Actions */}
      <div className="mt-6 space-y-6">
        {/* Admin safety controls */}
        {isAdmin && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="bg-white dark:bg-[#121b19] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Emergency Pause</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Blocks pay, add, update salary, withdraw, and next cycle.
                </p>
              </div>
              <Button
                variant="outline"
                className="py-1.5 px-3 text-xs"
                onClick={handleTogglePause}
                loading={submitting}
              >
                {paused ? (
                  <>
                    <PlayCircle className="h-3.5 w-3.5" /> Unpause
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </>
                )}
              </Button>
            </div>

            <form
              onSubmit={handleWithdraw}
              className="bg-white dark:bg-[#121b19] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2"
            >
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Withdraw Excess Funds
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  type="text"
                  placeholder="To G... (default: you)"
                  value={withdrawTo}
                  onChange={(e) => setWithdrawTo(e.target.value)}
                  className="sm:col-span-6 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount XLM"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="sm:col-span-3 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
                <Button type="submit" variant="outline" className="sm:col-span-3 w-full py-2 text-xs" loading={submitting} disabled={paused}>
                  Withdraw
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Add Employee Form for Smart Contract */}
        {isAdmin && (
          <form onSubmit={handleAddEmployeeContract} className="bg-white dark:bg-[#121b19] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Add Employee to On-Chain Smart Contract Roster
            </h4>

            {formError && (
              <div className="p-2.5 text-xs font-medium text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  placeholder="Stellar Public Key (G...)"
                  value={empAddress}
                  onChange={(e) => setEmpAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Salary (XLM)"
                  value={empSalary}
                  onChange={(e) => setEmpSalary(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" className="w-full py-2 text-xs" loading={submitting} disabled={paused}>
                  Add On-Chain
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Execute Contract Bulk Payroll */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-5 text-white shadow-md border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-400 shrink-0" />
              <h4 className="text-base font-bold">Trigger On-Chain Bulk Payroll</h4>
            </div>
            <p className="text-xs text-slate-300 dark:text-slate-400 mt-1 leading-relaxed">
              Pays unpaid active employees using the token pinned at initialize, then advances the cycle.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full sm:w-auto px-6 py-3 text-sm shadow-lg shadow-emerald-600/30"
            onClick={handleExecutePayroll}
            loading={submitting}
            disabled={!isAdmin || submitting || paused}
          >
            <Coins className="h-4 w-4" />
            Execute Cycle #{cycle} Payroll
          </Button>
        </div>

        {/* Event Logs & Execution Feed — shown whenever a contract is configured,
            so the stream status is visible even before the first event arrives. */}
        {contractId && contractIdValid && (
          <div className="bg-slate-950 rounded-2xl p-4 text-emerald-400 font-mono text-xs border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h4 className="text-slate-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-emerald-500" /> Soroban Contract Execution Stream
              </h4>
              {streamStatus === "live" && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <Radio className="h-3 w-3 text-emerald-400 animate-pulse" /> Live
                </span>
              )}
              {streamStatus === "connecting" && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Listening…
                </span>
              )}
              {streamStatus === "error" && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/60">
                  <WifiOff className="h-3 w-3" /> Reconnecting…
                </span>
              )}
              {streamStatus === "idle" && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  <WifiOff className="h-3 w-3 text-slate-500" /> Waiting
                </span>
              )}
            </div>

            {streamStatus === "error" && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-2">
                <span
                  className="text-[11px] text-rose-300/90"
                  title={streamError ?? undefined}
                >
                  Event stream unavailable — retrying automatically.
                </span>
                <button
                  type="button"
                  onClick={() => setStreamRetryKey((k) => k + 1)}
                  className="shrink-0 text-[11px] font-bold text-emerald-300 transition hover:text-emerald-200 cursor-pointer"
                >
                  Retry now
                </button>
              </div>
            )}

            {logs.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-slate-900/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span>{log.msg}</span>
                    </div>
                    {log.txHash && (
                      <a
                        href={EXPLORER_TX(log.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-sans font-semibold transition"
                      >
                        Tx Hash <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {streamStatus === "error"
                  ? "No contract events could be fetched yet."
                  : "No contract events observed yet — actions you run here will appear as they confirm on-chain."}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
