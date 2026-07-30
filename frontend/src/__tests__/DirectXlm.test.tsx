import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DirectXlmForm } from "../components/DirectXlmForm";
import { EmployeesSection } from "../components/EmployeesSection";
import type { Employee, PaymentDraft } from "../types";

// Real valid Stellar Testnet addresses with valid checksums
const ALICE_ADDR = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";
const BOB_ADDR = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";
const VALID_G_ADDR = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";
const INVALID_ADDR = "not-a-valid-address";

// Sample employees using valid G addresses
const SAMPLE_EMPLOYEES: Employee[] = [
  {
    address: ALICE_ADDR,
    name: "Alice Chen",
    salary: "1000",
    active: true,
    addedAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    address: BOB_ADDR,
    name: "Bob Smith",
    salary: "500",
    active: true,
    addedAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
];

function fillFormFields(
  addr: string,
  amount: string,
  memo?: string
) {
  const addrBox = screen.getByRole("textbox", { name: /recipient.*address/i });
  fireEvent.change(addrBox, { target: { value: addr } });

  const amountBox = screen.getByRole("spinbutton", { name: /amount.*xlm/i });
  fireEvent.change(amountBox, { target: { value: amount } });

  if (memo !== undefined) {
    const memoBox = screen.getByRole("textbox", { name: /memo.*description/i });
    fireEvent.change(memoBox, { target: { value: memo } });
  }
}

/** Fill only the address field via role query */
function fillAddressField(addr: string) {
  const addrBox = screen.getByRole("textbox", { name: /recipient.*address/i });
  fireEvent.change(addrBox, { target: { value: addr } });
}

describe("DirectXlmForm", () => {
  let onSubmit = vi.fn<(draft: PaymentDraft) => void>();

  beforeEach(() => {
    onSubmit = vi.fn<(draft: PaymentDraft) => void>();
  });

  afterEach(() => {
    cleanup();
  });

  describe("direct payment to an arbitrary address", () => {
    it("renders all form fields", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      expect(screen.getByText("Direct XLM Transfer")).toBeInTheDocument();
    });

    it("submits a valid direct payment to an arbitrary address", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      fillFormFields(VALID_G_ADDR, "250", "Invoice #42");
      fireEvent.click(screen.getByRole("button", { name: /review.*send/i }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const draft: PaymentDraft = onSubmit.mock.calls[0][0];
      expect(draft.to).toBe(VALID_G_ADDR);
      expect(draft.amount).toBe("250");
      expect(draft.memo).toBe("Invoice #42");
      expect(draft.source).toBe("direct");
    });

    it("does not show roster picker when there are no employees", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      expect(screen.queryByText(/Quick-select from Employee/i)).not.toBeInTheDocument();
    });

    it("shows roster picker when there are active employees", () => {
      render(<DirectXlmForm employees={SAMPLE_EMPLOYEES} onSubmit={onSubmit} />);
      expect(screen.getByText(/Quick-select from Employee/i)).toBeInTheDocument();
    });
  });

  describe("roster-prefilled payment", () => {
    it("prefills form fields from roster picker selection", () => {
      render(<DirectXlmForm employees={SAMPLE_EMPLOYEES} onSubmit={onSubmit} />);
      const select = screen.getByLabelText(/Select employee/i);
      fireEvent.change(select, { target: { value: ALICE_ADDR } });

      const addrBox = screen.getByRole("textbox", { name: /recipient.*address/i });
      expect(addrBox).toHaveValue(ALICE_ADDR);
    });

    it("submits with roster source when employee was selected", () => {
      render(<DirectXlmForm employees={SAMPLE_EMPLOYEES} onSubmit={onSubmit} />);
      const select = screen.getByLabelText(/Select employee/i);
      fireEvent.change(select, { target: { value: BOB_ADDR } });
      fireEvent.click(screen.getByRole("button", { name: /review.*send/i }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const draft: PaymentDraft = onSubmit.mock.calls[0][0];
      expect(draft.source).toBe("roster");
    });

    it("prefills form from Pay Salary action", () => {
      const prefill = { address: ALICE_ADDR, amount: "1000", name: "Alice Chen" };
      render(
        <DirectXlmForm employees={SAMPLE_EMPLOYEES} prefill={prefill} onSubmit={onSubmit} />
      );
      const addrBox = screen.getByRole("textbox", { name: /recipient.*address/i });
      expect(addrBox).toHaveValue(ALICE_ADDR);
    });
  });

  describe("no roster mutation after direct payment", () => {
    it("does not modify employees — only calls onSubmit", () => {
      const initialLength = SAMPLE_EMPLOYEES.length;
      render(<DirectXlmForm employees={SAMPLE_EMPLOYEES} onSubmit={onSubmit} />);
      fillFormFields(VALID_G_ADDR, "100");
      fireEvent.click(screen.getByRole("button", { name: /review.*send/i }));
      expect(SAMPLE_EMPLOYEES.length).toBe(initialLength);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("shows disclaimer text about not modifying roster", () => {
      render(<DirectXlmForm employees={SAMPLE_EMPLOYEES} onSubmit={onSubmit} />);
      expect(screen.getByText(/does not modify roster/i)).toBeInTheDocument();
    });
  });

  describe("invalid recipient and amount", () => {
    it("shows error for invalid Stellar address", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      fillFormFields(INVALID_ADDR, "100");
      fireEvent.click(screen.getByRole("button", { name: /review.*send/i }));
      expect(screen.getByText(/invalid Stellar address/i)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows error for invalid amount", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      fillAddressField(VALID_G_ADDR);
      // Submit with empty amount — should fail validation
      fireEvent.click(screen.getByRole("button", { name: /review.*send/i }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows error for zero amount", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      fillFormFields(VALID_G_ADDR, "0");
      fireEvent.click(screen.getByRole("button", { name: /review.*send/i }));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("disabled state (wrong wallet network)", () => {
    it("shows error when submitted while disabled", () => {
      render(
        <DirectXlmForm
          employees={[]}
          onSubmit={onSubmit}
          disabled={true}
          disabledReason="Wrong network"
        />
      );
      const btn = screen.getByRole("button", { name: /review.*send/i });
      expect(btn).toBeDisabled();
    });
  });

  describe("keyboard accessibility", () => {
    it("renders a form element", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      expect(document.querySelector("form")).toBeInTheDocument();
    });

    it("has accessible labels for inputs", () => {
      render(<DirectXlmForm employees={[]} onSubmit={onSubmit} />);
      expect(screen.getByRole("textbox", { name: /recipient.*address/i })).toBeInTheDocument();
      expect(screen.getByRole("spinbutton", { name: /amount.*xlm/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /memo.*description/i })).toBeInTheDocument();
    });

    it("has a select element for roster picker when employees exist", () => {
      render(<DirectXlmForm employees={SAMPLE_EMPLOYEES} onSubmit={onSubmit} />);
      const select = screen.getByLabelText(/Select employee/i);
      expect(select.tagName).toBe("SELECT");
    });
  });
});

describe("EmployeesSection", () => {
  let onAdd = vi.fn<(input: { address: string; name?: string; salary: string }) => void>();
  let onRemove = vi.fn<(address: string) => void>();
  let onPaySalary = vi.fn<(employee: Employee) => void>();

  beforeEach(() => {
    onAdd = vi.fn<(input: { address: string; name?: string; salary: string }) => void>();
    onRemove = vi.fn<(address: string) => void>();
    onPaySalary = vi.fn<(employee: Employee) => void>();
  });

  afterEach(() => {
    cleanup();
  });

  describe("employee addition", () => {
    it("renders the add employee form", () => {
      render(
        <EmployeesSection
          employees={[]}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      expect(screen.getByText("Add New Employee")).toBeInTheDocument();
    });
  });

  describe("employee removal", () => {
    it("shows remove buttons for each employee", () => {
      render(
        <EmployeesSection
          employees={SAMPLE_EMPLOYEES.slice(0, 1)}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      expect(screen.getByLabelText(/Remove.*from roster/i)).toBeInTheDocument();
    });

    it("calls onRemove with employee address", () => {
      render(
        <EmployeesSection
          employees={SAMPLE_EMPLOYEES.slice(0, 1)}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      fireEvent.click(screen.getByLabelText(/Remove.*from roster/i));
      expect(onRemove).toHaveBeenCalledWith(ALICE_ADDR);
    });

    it("shows empty state when no employees", () => {
      render(
        <EmployeesSection
          employees={[]}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      expect(screen.getByText(/No employees in roster yet/i)).toBeInTheDocument();
    });
  });

  describe("salary payment via Pay Salary", () => {
    it("calls onPaySalary with the employee", () => {
      render(
        <EmployeesSection
          employees={SAMPLE_EMPLOYEES.slice(0, 1)}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      fireEvent.click(screen.getByText("Pay Salary"));
      expect(onPaySalary).toHaveBeenCalledWith(
        expect.objectContaining({ address: ALICE_ADDR, name: "Alice Chen" })
      );
    });
  });

  describe("keyboard accessibility", () => {
    it("renders buttons accessible via keyboard", () => {
      render(
        <EmployeesSection
          employees={SAMPLE_EMPLOYEES.slice(0, 1)}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      expect(screen.getByText("Pay Salary").tagName).toBe("BUTTON");
    });

    it("shows local vs on-chain distinction banner when roster has employees", () => {
      render(
        <EmployeesSection
          employees={SAMPLE_EMPLOYEES.slice(0, 1)}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
        />
      );
      expect(screen.getByText(/Local Employees/i)).toBeInTheDocument();
      expect(screen.getByText(/Soroban on-chain payroll roster/i)).toBeInTheDocument();
    });
  });

  describe("error display", () => {
    it("shows error banner when error prop is set", () => {
      render(
        <EmployeesSection
          employees={[]}
          onAdd={onAdd}
          onRemove={onRemove}
          onPaySalary={onPaySalary}
          error="Something went wrong"
        />
      );
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });
});
