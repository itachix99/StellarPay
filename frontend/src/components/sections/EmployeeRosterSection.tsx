// Employee Roster section — local, browser-persisted payroll contacts.
// Add/remove employees, roster stats, and per-employee "Pay Salary" actions that
// prefill the Direct XLM form. Separate from the Soroban on-chain roster.
import { EmployeesSection } from "../EmployeesSection";
import type { Employee } from "../../types";

interface EmployeeRosterSectionProps {
  employees: Employee[];
  onAdd: (input: { address: string; name?: string; salary: string }) => void;
  onRemove: (address: string) => void;
  onPaySalary: (employee: Employee) => void;
  error?: string | null;
}

export function EmployeeRosterSection({
  employees,
  onAdd,
  onRemove,
  onPaySalary,
  error,
}: EmployeeRosterSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          Employee Roster
        </h2>
        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
          Browser-persisted payroll contacts used for direct XLM transfers. These
          live locally and are separate from the on-chain Soroban payroll roster.
        </p>
      </div>

      <EmployeesSection
        employees={employees}
        onAdd={onAdd}
        onRemove={onRemove}
        onPaySalary={onPaySalary}
        error={error}
      />
    </div>
  );
}
