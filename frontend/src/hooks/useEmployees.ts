// Employee roster persisted in localStorage (Level 1 — local list only).
import { useCallback, useEffect, useRef, useState } from "react";
import type { Employee } from "../types";
import { isValidPublicKey, isValidXlmAmount } from "../lib/stellar";

const KEY = "stellarpay.employees";

export class RosterError extends Error {}

function isEmployeeShape(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeEmployee(raw: Record<string, unknown>): Employee | null {
  const address = typeof raw.address === "string" ? raw.address.trim() : "";
  const salary = typeof raw.salary === "string" ? raw.salary.trim() : "";
  if (!isValidPublicKey(address) || !isValidXlmAmount(salary)) {
    return null;
  }

  const name =
    typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : undefined;
  const active = typeof raw.active === "boolean" ? raw.active : true;
  const addedAt = typeof raw.addedAt === "number" ? raw.addedAt : Date.now();
  const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : addedAt;

  return { address, name, salary, active, addedAt, updatedAt };
}

function load(): Employee[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isEmployeeShape)
      .map(sanitizeEmployee)
      .filter((e): e is Employee => e !== null);
  } catch {
    return [];
  }
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(load);
  const employeesRef = useRef(employees);
  employeesRef.current = employees;

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(employees));
  }, [employees]);

  const addEmployee = useCallback(
    (input: { address: string; name?: string; salary: string }) => {
      const address = input.address.trim();
      if (!isValidPublicKey(address)) {
        throw new RosterError("Invalid Stellar public key (must start with G).");
      }
      if (!isValidXlmAmount(input.salary)) {
        throw new RosterError("Salary must be a positive number.");
      }

      if (employeesRef.current.some((e) => e.address === address)) {
        throw new RosterError("This employee is already in the roster.");
      }

      const now = Date.now();
      setEmployees((prev) => [
        ...prev,
        {
          address,
          name: input.name?.trim() || undefined,
          salary: input.salary.trim(),
          active: true,
          addedAt: now,
          updatedAt: now,
        },
      ]);
    },
    [],
  );

  const removeEmployee = useCallback((address: string) => {
    setEmployees((prev) => prev.filter((e) => e.address !== address));
  }, []);

  return { employees, addEmployee, removeEmployee };
}
