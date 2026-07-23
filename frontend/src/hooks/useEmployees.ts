// Employee roster persisted in localStorage (Level 1 — local list only).
import { useCallback, useEffect, useState } from "react";
import type { Employee } from "../types";
import { isValidPublicKey } from "../lib/stellar";

const KEY = "stellarpay.employees";

export class RosterError extends Error {}

function load(): Employee[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch {
    return [];
  }
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(employees));
  }, [employees]);

  const addEmployee = useCallback(
    (input: { address: string; name?: string; salary: string }) => {
      const address = input.address.trim();
      if (!isValidPublicKey(address)) {
        throw new RosterError("Invalid Stellar public key (must start with G).");
      }
      const amt = Number(input.salary);
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new RosterError("Salary must be a positive number.");
      }
      // Validate duplicates before setState — throwing inside the updater
      // does not propagate to this caller in React.
      setEmployees((prev) => {
        if (prev.some((e) => e.address === address)) {
          // Already present: return unchanged; caller re-checks below.
          return prev;
        }
        const now = Date.now();
        return [
          ...prev,
          {
            address,
            name: input.name?.trim() || undefined,
            salary: input.salary,
            active: true,
            addedAt: now,
            updatedAt: now,
          },
        ];
      });
      // Closure-based duplicate guard for immediate user feedback.
      if (employees.some((e) => e.address === address)) {
        throw new RosterError("This employee is already in the roster.");
      }
    },
    [employees],
  );

  const removeEmployee = useCallback((address: string) => {
    setEmployees((prev) => prev.filter((e) => e.address !== address));
  }, []);

  return { employees, addEmployee, removeEmployee };
}
