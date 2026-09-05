import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { demoData } from "@/lib/data/demo";
import { DivvyDashboard } from "./divvy-dashboard";

afterEach(cleanup);

describe("DivvyDashboard", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("opens statement import from the dashboard", async () => {
    render(
      <ThemeProvider>
        <DivvyDashboard initialData={demoData} demoMode />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Import statement" }));

    expect(
      await screen.findByRole("heading", { name: "Import a statement" }),
    ).toBeTruthy();
  });
});
