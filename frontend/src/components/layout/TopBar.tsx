// Persistent top bar for the application shell.
// Holds the brand, a mobile menu button, the About/onboarding trigger, and the
// wallet controls (connect / balance / network / theme / disconnect).
import { Info, Menu, X } from "lucide-react";
import logoSrc from "../../assets/logo_lightmode.svg";
import logoSrcDark from "../../assets/logo_darkmode.svg";
import { WalletBar } from "../ui";

interface TopBarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onAbout: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleDrawer: () => void;
  drawerOpen: boolean;
  /** Show the mobile hamburger (only when the sidebar shell is active). */
  showMenuButton: boolean;
  walletAddress: string | null;
  walletBalance: string | null;
  walletNetwork: "TESTNET" | "WRONG" | "UNKNOWN";
  walletConnecting: boolean;
  walletLoadingBalance: boolean;
}

export function TopBar({
  theme,
  onToggleTheme,
  onAbout,
  onConnect,
  onDisconnect,
  onToggleDrawer,
  drawerOpen,
  showMenuButton,
  walletAddress,
  walletBalance,
  walletNetwork,
  walletConnecting,
  walletLoadingBalance,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b1413]/90 backdrop-blur-md transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          {showMenuButton && (
            <button
              type="button"
              onClick={onToggleDrawer}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="stellarpay-mobile-nav"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-2xs lg:hidden cursor-pointer"
            >
              {drawerOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}

          <img
            src={theme === "dark" ? logoSrcDark : logoSrc}
            alt="StellarPay"
            className="h-9 w-auto"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onAbout}
            aria-label="About StellarPay"
            title="Project overview & onboarding"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14201e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          <WalletBar
            address={walletAddress}
            balance={walletBalance}
            network={walletNetwork}
            connecting={walletConnecting}
            loadingBalance={walletLoadingBalance}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        </div>
      </div>
    </header>
  );
}
