---
name: StellarPay
description: Decentralized Payroll & Salary Distribution Platform on Stellar & Soroban
colors:
  primary: "#059669"
  primary-hover: "#047857"
  primary-light: "#ecfdf5"
  neutral-bg: "#f8fafc"
  neutral-card: "#ffffff"
  neutral-ink: "#0f172a"
  neutral-muted: "#64748b"
  neutral-border: "#e2e8f0"
  accent-teal: "#0d9488"
  danger: "#e11d48"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: StellarPay

## 1. Overview

**Creative North Star: "The Financial Command Vault"**

StellarPay embodies a high-precision, non-custodial financial dashboard aesthetic. Built with clean slate neutrals and vibrant emerald/teal accents, the design communicates security, transparency, and instant settlement clarity. The interface rejects dark-mode clichés, noisy purple gradients, and decorative glassmorphism blurs in favor of crisp borders, high-contrast typography, and purposeful micro-interactions.

### Key Characteristics:
- **Dual-Theme Foundation**: Off-white canvas (`#f8fafc` / `dark:#0b1413`) paired with crisp card containers (`#ffffff` / `dark:#121b19`) and refined slate borders (`#e2e8f0` / `dark:border-slate-800`).
- **Emerald Settlement Accent**: `#059669` carries authority for active states, balances, and action triggers in both Light and Dark modes.
- **StellarWalletKit Modal**: Clean multi-wallet selector supporting Freighter, Albedo, xBull, and Lobstr.
- **Micro-Feedback**: Every transaction, contract invocation, and wallet status emits immediate feedback via toasts or status streams.

## 2. Colors

The StellarPay palette relies on a restrained emerald-teal accent paired with a high-contrast neutral slate hierarchy.

### Primary
- **Emerald Primary** (`#059669` / `brand-600`): Used for primary action buttons, active status badges, and transaction highlights.
- **Emerald Hover** (`#047857` / `brand-700`): Darker shade for active button hover states.
- **Emerald Tint** (`#ecfdf5` / `brand-50`): Soft background tint for active cards, success banners, and pills.

### Neutral
- **Deep Ink** (`#0f172a` / `slate-900`): Primary heading and high-emphasis body text.
- **Slate Muted** (`#64748b` / `slate-500`): Subtitles, helper text, and inactive metadata.
- **Slate Border** (`#e2e8f0` / `slate-200`): Subtle 1px container boundaries.
- **Canvas Background** (`#f8fafc` / `slate-50`): Application body background.

### Named Rules
**The Single Accent Rule.** Emerald `#059669` is used on ≤10% of any given screen section. Its scarcity preserves visual hierarchy and draws immediate attention to critical financial actions.

## 3. Typography

**Display & Body Font:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

**Character:** Clean, highly legible system font stack optimized for rapid data scanning across desktop and mobile screens.

### Hierarchy
- **Display** (Font Weight: 800, Size: `clamp(1.5rem, 4vw, 2.25rem)`, Line Height: 1.2): Main header titles and hero value props.
- **Headline** (Font Weight: 700, Size: 1.125rem / 18px, Line Height: 1.3): Section headers (`Employees`, `Soroban Smart Contract`).
- **Title** (Font Weight: 600, Size: 0.875rem / 14px, Line Height: 1.4): Employee names, card headers, form label titles.
- **Body** (Font Weight: 400, Size: 0.875rem / 14px, Line Height: 1.5): Standard paragraphs, transaction feedback messages.
- **Label / Mono** (Font Weight: 500, Size: 0.75rem / 12px, Font Family: monospace): Stellar public keys, contract IDs, and transaction hashes.
- **Compact** (Font Weight: 600, Size: 0.6875rem / 11px, Line Height: 1.3): Status badges, helper text, secondary metadata.
- **Micro** (Font Weight: 500, Size: 0.625rem / 10px, Line Height: 1.2): Unit suffixes (XLM), copy-chip labels, uppercase category headers.

## 4. Elevation

StellarPay uses flat, border-dominant layering over heavy drop shadows. Depth is established through subtle 1px slate borders (`#e2e8f0`) and soft ambient micro-shadows (`shadow-xs` / `shadow-2xs`).

### Named Rules
**The Flat-By-Default Rule.** All cards and containers rest flat on the `#f8fafc` canvas with crisp 1px borders. Elevation shadows appear only as hover responses or modal backdrops.

## 5. Components

### Buttons
- **Shape:** Rounded corners (`12px` / `rounded-xl`).
- **Primary:** Background `#059669`, text white, padding `10px 18px`.
- **Secondary / Outline:** Background white, 1px border `#cbd5e1`, text `#334155`.
- **Danger:** Background `#fff1f2`, border `#fecdd3`, text `#e11d48`.

### Cards / Containers
- **Corner Style:** Rounded-2xl (`16px`).
- **Background:** Crisp white `#ffffff` with 1px border `#e2e8f0`.
- **Padding:** `20px` (`p-5`).

### Inputs / Fields
- **Style:** Background `#f8fafc`, 1px border `#e2e8f0`, rounded-xl (`12px`), padding `10px 14px`.
- **Focus:** Border shift to `#10b981` with soft emerald focus ring (`ring-emerald-500/20`).

## 6. Do's and Don'ts

### Do:
- **Do** maintain a text contrast ratio ≥ 4.5:1 on all label and body text against backgrounds.
- **Do** truncate long Stellar public keys (e.g. `GAAZI4…LVB3R`) using monospace font formatting.
- **Do** provide immediate clickable explorer links (`https://stellar.expert/explorer/testnet/...`) for all submitted transaction hashes.

### Don't:
- **Don't** use low-contrast gray text on tinted backgrounds.
- **Don't** use purple gradients, heavy glassmorphism blurs, or cheesy 3D crypto illustrations.
- **Don't** use side-stripe colored borders on list cards or callout alerts.
