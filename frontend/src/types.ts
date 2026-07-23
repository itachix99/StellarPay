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
