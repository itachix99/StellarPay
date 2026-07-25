import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

function GoodComponent() {
  return <div>All good here</div>;
}

/** Component that always throws — tests ErrorBoundary catch behavior. */
function ThrowingComponent(): React.ReactNode {
  throw new Error("Test error message");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children normally when no error", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good here")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("reload button triggers location.reload", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadFn = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadFn },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    screen.getByText("Reload Page").click();
    expect(reloadFn).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("error message is displayed in a monospace container", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Test error message").closest("p")).toHaveClass("font-mono");

    spy.mockRestore();
  });
});