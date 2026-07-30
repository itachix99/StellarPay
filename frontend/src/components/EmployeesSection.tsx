// Employees Section — manages the local employee roster (browser-persisted contacts).
// Contains Add Employee form, roster list, remove, and Pay Salary actions.
// Pay Salary prefills the Direct XLM form rather than having its own payment logic.
import { Card, EmployeeForm, EmployeeCard } from "./ui";
import type { Employee } from "../types";
import { Users, Coins, AlertCircle } from "lucide-react";

interface EmployeesSectionProps {
  employees: Employee[];
  onAdd: (input: { address: string; name?: string; salary: string }) => void;
  onRemove: (address: string) => void;
  onPaySalary: (employee: Employee) => void;
  error?: string | null;
}

export function EmployeesSection({
  employees,
  onAdd,
  onRemove,
  onPaySalary,
  error,
}: EmployeesSectionProps) {
  const activeEmployees = employees.filter((e) => e.active);
  const totalPayroll = activeEmployees.reduce(
    (sum, e) => sum + Number(e.salary),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Employee Form */}
      <EmployeeForm onAdd={onAdd} />

      {/* Roster Stats */}
      {employees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex items-center gap-4 bg-white dark:bg-[#121b19]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Employees
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {activeEmployees.length}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / {employees.length} total
                </span>
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 bg-white dark:bg-[#121b19]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/60 shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Monthly Payroll
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {totalPayroll.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-500">XLM</span>
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Employee Roster */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Employee Roster
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Browser-persisted contacts
          </span>
        </div>

        {employees.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No employees in roster yet. Add employees above to get started.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Local employees are stored in your browser and serve as quick-payment
              contacts. They are separate from the Soroban on-chain payroll roster.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {employees.map((emp) => (
              <EmployeeCard
                key={emp.address}
                employee={emp}
                onPay={onPaySalary}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info banner distinguishing local vs on-chain */}
      {employees.length > 0 && (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0b1413] border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-700 dark:text-slate-300">Local Employees</strong> are
            browser-persisted quick-payment contacts used for direct XLM transfers.
            They are independent from the{" "}
            <strong className="text-slate-700 dark:text-slate-300">Soroban on-chain payroll roster</strong>{" "}
            managed in the smart contract section.
          </p>
        </div>
      )}
    </div>
  );
}
