import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("StellarPay ErrorBoundary caught:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f3f5f4] dark:bg-[#0b1413] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121b19] p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              An unexpected error occurred. Your wallet and funds are safe.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800 overflow-x-auto">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14201e] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-emerald-500 dark:hover:bg-emerald-400 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}