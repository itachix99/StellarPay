// Project onboarding overview — first-run information surface for StellarPay.
// Surfaces what the product does, the tech stack, supported wallets, the
// deployed contract address, security posture, and quick-start steps.
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Check,
  CheckCircle2,
  Code2,
  Coins,
  Copy,
  Cpu,
  Layers,
  Lock,
  Network,
  Pause,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Button, shortKey } from "./ui";
import { SUPPORTED_WALLETS } from "../lib/wallet";
import { NATIVE_SAC_TESTNET, SOROBAN_RPC_URL } from "../lib/soroban";
import { HORIZON_URL } from "../config";

interface OnboardingPageProps {
  onClose: () => void;
  onConnect: () => void | Promise<void>;
  connecting?: boolean;
  walletConnected: boolean;
}

type IconType = typeof Wallet;

const FEATURES: Array<{
  title: string;
  icon: IconType;
  desc: string;
  points: string[];
}> = [
  {
    title: "Wallet & Direct Transfers",
    icon: Wallet,
    desc: "Freighter integration, live XLM balance, local roster, direct salary transfers.",
    points: [
      "Connect Freighter and read live XLM balance",
      "Build a local employee roster in your browser",
      "Sign direct XLM salary transfers on Testnet",
    ],
  },
  {
    title: "Soroban Payroll Smart Contract",
    icon: Cpu,
    desc: "On-chain roster, admin RBAC, pinned token, pause / withdraw, cycle-safe bulk payroll, events.",
    points: [
      "On-chain roster with admin access control",
      "Pinned native SAC (XLM) token for payouts",
      "Pause, withdraw, and cycle-safe bulk execution",
    ],
  },
  {
    title: "Automation & CI",
    icon: Zap,
    desc: "Dry-run scheduler, Rust + Vitest tests, GitHub Actions CI.",
    points: [
      "Dry-run scheduler (execute opt-in, testnet only)",
      "Rust contract tests + Vitest frontend tests",
      "GitHub Actions continuous integration",
    ],
  },
];

const TECH_STACK: Array<{ label: string; value: string; icon: IconType }> = [
  { label: "Frontend", value: "Vite + React + TypeScript + Tailwind CSS", icon: Code2 },
  { label: "Wallet Integration", value: "Stellar Wallets Kit (@creit-tech/stellar-wallets-kit)", icon: Wallet },
  { label: "Stellar SDK", value: "@stellar/stellar-sdk", icon: Boxes },
  { label: "Smart Contract", value: "Rust + Soroban SDK 27", icon: Cpu },
  { label: "Network", value: "Stellar Testnet only", icon: Network },
];

const EXTRA_WALLETS: Array<{ name: string; available: boolean }> = [
  { name: "Freighter", available: true },
  { name: "Albedo", available: true },
  { name: "xBull Wallet", available: true },
  { name: "LOBSTR Vault", available: true },
  { name: "HOT Wallet", available: true },
  { name: "Hana Wallet", available: true },
  { name: "Rabet", available: true },
  { name: "Klever Wallet", available: true },
];


const PRINCIPLES: Array<{ title: string; desc: string; icon: IconType }> = [
  { title: "Non-custodial UI", desc: "Freighter signs client-side; no private keys in the web app.", icon: ShieldCheck },
  { title: "Admin protection", desc: "Contract methods require admin require_auth().", icon: Shield },
  { title: "Pinned token", desc: "Payroll and withdraw use the token set at initialize.", icon: Lock },
  { title: "Fund recovery", desc: "Admin withdraw recovers excess contract balance.", icon: Banknote },
  { title: "Emergency pause", desc: "Blocks pay / add / update / withdraw / next_cycle.", icon: Pause },
  { title: "Cycle safety", desc: "next_cycle blocked while unpaid active employees remain.", icon: RefreshCw },
  { title: "Storage TTL", desc: "Instance and employee entries extended on mutations.", icon: Layers },
  { title: "Client guards", desc: "Valid C... IDs, fail-closed Testnet assert, decimal-string XLM.", icon: Check },
  { title: "Testnet-only", desc: "Configured for Stellar Testnet; never mainnet.", icon: Network },
];



function CopyChip({
  value,
  label,
  href,
}: {
  value: string;
  label?: string;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        title="Copy to clipboard"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1413] px-2.5 py-1.5 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-700/80 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
      >
        <span className="truncate max-w-[260px] sm:max-w-[420px]">{label ?? shortKey(value)}</span>
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <Copy className="h-3 w-3 text-slate-400 shrink-0" />
        )}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title="View on Stellar Expert ↗"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1413] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700/80 transition"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: IconType;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {desc && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            {desc}
          </p>
        )}
      </div>
    </div>
  );
}

export function OnboardingPage({
  onClose,
  onConnect,
  connecting = false,
  walletConnected,
}: OnboardingPageProps) {
  const contractId = import.meta.env.VITE_SOROBAN_CONTRACT_ID || "";
  const explorerContract = (id: string) =>
    `https://stellar.expert/explorer/testnet/contract/${id}`;

  const handlePrimary = async () => {
    if (!walletConnected) {
      await onConnect();
    }
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#f3f5f4] dark:bg-[#0b1413] text-slate-900 dark:text-slate-100 antialiased animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="StellarPay project overview"
    >
      {/* Sticky top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#091210]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-500 font-black text-white dark:text-slate-950 text-sm shadow-xs">
              S/
            </div>
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-tight">StellarPay</p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Project Overview
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close overview"
            title="Close & continue"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Hero — committed dark-teal welcome band */}
      <section className="bg-[#0c2d28] text-white border-b border-emerald-900/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Stellar Testnet · Non-custodial
          </div>

          <h1 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight leading-[1.08] max-w-3xl">
            Decentralized payroll &amp; salary distribution on Stellar &amp; Soroban.
          </h1>

          <p className="mt-4 text-sm sm:text-base text-emerald-100/80 leading-relaxed max-w-2xl">
            StellarPay turns an employee roster into verifiable Testnet XLM &amp; Soroban
            smart-contract transfers. The wallet approves the exact payout before Stellar settles —
            no subscription, no prepaid balance, no custody.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              onClick={handlePrimary}
              loading={connecting}
              variant="primary"
              className="w-full sm:w-auto px-6 py-3 text-sm shadow-lg shadow-emerald-600/30"
            >
              {walletConnected ? (
                <>
                  Continue to console <ArrowRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Connect wallet &amp; start <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-emerald-200/80 hover:text-white transition px-2 py-2"
            >
              I&apos;ll explore on my own
            </button>
          </div>

          <dl className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-px bg-emerald-900/40 rounded-2xl overflow-hidden border border-emerald-800/40">
            {[
              { k: "Network", v: "Stellar Testnet" },
              { k: "Settlement", v: "XLM · Soroban" },
              { k: "Custody", v: "Non-custodial" },
              { k: "Contract", v: "Rust + Soroban 27" },
            ].map((m) => (
              <div key={m.k} className="bg-[#0c2d28] px-4 py-3.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  {m.k}
                </dt>
                <dd className="mt-1 text-sm font-bold text-white">{m.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        {/* What it does */}
        <section className="space-y-6">
          <SectionHeader
            icon={Layers}
            title="What it does"
            desc="Core platform capabilities for non-custodial Stellar & Soroban payroll."
          />
          <div className="space-y-4">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#101a18] p-5 shadow-2xs"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                        {feat.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {feat.desc}
                      </p>
                      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {feat.points.map((p) => (
                          <li
                            key={p}
                            className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tech stack — definition list, not identical cards */}
        <section className="space-y-6">
          <SectionHeader
            icon={Code2}
            title="Tech stack"
            desc="The exact pieces this product is built from."
          />
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#101a18] shadow-2xs">
            {TECH_STACK.map((t, i) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.label}
                  className={`flex items-center gap-4 px-5 py-3.5 ${
                    i !== 0 ? "border-t border-slate-100 dark:border-slate-800/80" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="w-28 sm:w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t.label}
                  </span>
                  <span className="flex-1 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 break-words">
                    {t.value}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Supported wallets */}
        <section className="space-y-6">
          <SectionHeader
            icon={Wallet}
            title="Supported wallets"
            desc="Stellar Wallet Kit selector — Freighter is the active signing path today."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              {SUPPORTED_WALLETS.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#101a18] p-3.5 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {w.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {w.description}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/70 dark:border-emerald-800/70 px-2.5 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {EXTRA_WALLETS.map((extra) => (
                <div
                  key={extra.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-950/30 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 border border-slate-200/60 dark:border-slate-800">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {extra.name}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      extra.available
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {extra.available ? "Supported" : "Not available"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contract & network — financial-grade transparency */}
        <section className="space-y-6">
          <SectionHeader
            icon={Server}
            title="Contract & network"
            desc="Live deployed addresses and endpoints on Stellar Testnet. Copy any value to inspect on Stellar Expert."
          />
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#101a18] shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
            <KVRow
              label="Payroll Contract ID"
              icon={Cpu}
              hint={contractId ? "Soroban · deployed" : "Set VITE_SOROBAN_CONTRACT_ID in .env"}
            >
              {contractId ? (
                <CopyChip
                  value={contractId}
                  label={contractId}
                  href={explorerContract(contractId)}
                />
              ) : (
                <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                  not configured
                </span>
              )}
            </KVRow>
            <KVRow label="Native SAC (XLM) Token" icon={Coins}>
              <CopyChip
                value={NATIVE_SAC_TESTNET}
                label={NATIVE_SAC_TESTNET}
                href={explorerContract(NATIVE_SAC_TESTNET)}
              />
            </KVRow>
            <KVRow label="Soroban RPC" icon={Server}>
              <CopyChip value={SOROBAN_RPC_URL} label={SOROBAN_RPC_URL} />
            </KVRow>
            <KVRow label="Horizon API" icon={Network}>
              <CopyChip value={HORIZON_URL} label={HORIZON_URL} />
            </KVRow>
            <KVRow label="Network Passphrase" icon={Shield}>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                Test SDF Network ; September 2015
              </span>
            </KVRow>
          </div>
        </section>

        {/* Architecture flow */}
        <section className="space-y-6">
          <SectionHeader
            icon={Boxes}
            title="How a payout flows"
            desc="From roster request to on-chain receipt — non-custodial end to end."
          />
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#101a18] p-5 sm:p-6 shadow-2xs">
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { n: "1", t: "Roster request", d: "Bind employee salary, wallet, and cycle into one transaction.", icon: Users },
                { n: "2", t: "Wallet signs", d: "Freighter signs the non-custodial transfer client-side.", icon: Wallet },
                { n: "3", t: "Settles on Stellar", d: "Ledger verifies amount, recipient, and replay protection.", icon: Send },
                { n: "4", t: "Receipt streamed", d: "Explorer-linked proof unlocks the execution stream.", icon: Terminal },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.n} className="relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1413] p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-[10px] font-bold text-white dark:text-slate-950">
                        {s.n}
                      </span>
                      <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {s.t}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {s.d}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Security & operational principles */}
        <section className="space-y-6">
          <SectionHeader
            icon={ShieldCheck}
            title="Security & operational principles"
            desc="The contract and client guardrails that keep funds where they belong."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800">
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-white dark:bg-[#101a18] p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {p.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>



        
        <section className="rounded-3xl bg-[#0c2d28] text-white p-6 sm:p-8 border border-emerald-900/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Ready to run payroll?
              </h2>
              <p className="mt-1.5 text-sm text-emerald-100/80 leading-relaxed max-w-xl">
                {walletConnected
                  ? "Your wallet is connected. Close this overview to open the payment console."
                  : "Connect Freighter on Testnet to add employees and trigger your first cycle."}
              </p>
            </div>
            <Button
              onClick={handlePrimary}
              loading={connecting}
              variant="primary"
              className="w-full sm:w-auto px-6 py-3 text-sm shadow-lg shadow-emerald-600/30 shrink-0"
            >
              {walletConnected ? (
                <>
                  Continue to console <ArrowRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Connect wallet &amp; start <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>,
    document.body
  );
}

function KVRow({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon: IconType;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-4">
      <div className="flex items-center gap-2.5 sm:w-56 shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</p>
          {hint && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{hint}</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
