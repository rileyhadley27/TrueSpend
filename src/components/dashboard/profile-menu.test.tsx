import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ProfileMenu } from "./profile-menu";

afterEach(cleanup);

describe("ProfileMenu", () => {
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

  it("shows a working sign-out form in preview mode", async () => {
    render(
      <ThemeProvider>
        <ProfileMenu
          userName="Riley"
          userEmail="riley@example.com"
          isAdmin
          demoMode
          accounts={[]}
          onConnectAccount={() => undefined}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));

    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    const form = signOut.closest("form");

    expect(form).not.toBeNull();
    expect(form?.getAttribute("action")).toBe("/auth/signout");
    expect(form?.getAttribute("method")).toBe("post");
  });
});
