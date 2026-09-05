import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeControls() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <span>{theme}</span>
      <button onClick={() => setTheme("dark")}>Use dark</button>
      <button onClick={() => setTheme("light")}>Use light</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
  });

  it("applies and persists an explicit color theme", () => {
    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("divvy-theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Use light" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("divvy-theme")).toBe("light");
  });
});
