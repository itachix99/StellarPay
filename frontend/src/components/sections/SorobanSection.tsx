// Soroban Contract section — on-chain payroll dashboard (configuration,
// initialization, state sync, on-chain roster, pause/withdraw, bulk payroll
// execution and the event stream). Lazy-loaded because it pulls in the heavy
// Stellar SDK only when this section is first shown.
import { lazy, Suspense } from "react";
import { Spinner } from "../ui";

const SorobanDashboard = lazy(() =>
  import("../SorobanDashboard").then((m) => ({ default: m.SorobanDashboard })),
);

interface SorobanSectionProps {
  userAddress: string | null;
  network?: string;
}

export function SorobanSection({ userAddress, network }: SorobanSectionProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Spinner />
        </div>
      }
    >
      <SorobanDashboard userAddress={userAddress} network={network} />
    </Suspense>
  );
}
