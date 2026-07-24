// Shared types for StellarPay.

export interface Employee {
  /** Stellar public key (G...) — used as the unique id. */
  address: string;
  /** Optional display name. */
  name?: string;
  /** Salary in XLM, stored as a string to avoid float drift. */
  salary: string;
  active: boolean;
  addedAt: number;
  updatedAt: number;
}

/** Contract event types emitted by the Soroban payroll contract. */
export type ContractEventType =
  | "sal_paid"
  | "cyc_done"
  | "cyc_next"
  | "emp_add"
  | "emp_rm"
  | "emp_upd"
  | "emp_act"
  | "pause"
  | "adm_xfer"
  | "withdraw";

/** Parsed contract event payload from Soroban RPC. */
export interface ContractEvent {
  id: string;
  type: ContractEventType;
  /** Timestamp from the ledger close time (ISO string). */
  timestamp: string;
  /** Employee address involved (for sal_paid, emp_add, emp_rm, emp_upd). */
  employee?: string;
  /** Amount in stroops (for sal_paid, emp_add, emp_upd, withdraw). */
  amount?: bigint;
  /** Active flag (for emp_act, pause). */
  active?: boolean;
  /** New admin address (for adm_xfer). */
  newAdmin?: string;
  /** Cycle number (for cyc_done, cyc_next). */
  cycle?: number;
  /** Raw SCVal data for display. */
  rawData: unknown;
}

/** Options for event subscription. */
export interface EventSubscriptionOptions {
  contractId: string;
  /** Polling interval in ms (default 5000). */
  pollIntervalMs?: number;
  /** Maximum events to fetch per poll (default 20). */
  limit?: number;
  /** Called for each new event batch. */
  onEvents: (events: ContractEvent[]) => void;
  /** Called on subscription error. */
  onError?: (error: Error) => void;
}
