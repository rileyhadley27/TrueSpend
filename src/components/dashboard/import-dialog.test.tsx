import { webcrypto } from "node:crypto";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImportDialog } from "./import-dialog";

afterEach(cleanup);

describe("ImportDialog", () => {
  it("guides a new user into account setup instead of blocking import", () => {
    const onOpenChange = vi.fn();
    const onAddAccount = vi.fn();

    render(
      <ImportDialog
        open
        onOpenChange={onOpenChange}
        accounts={[]}
        onAddAccount={onAddAccount}
        onCommit={() => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add your first account" }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onAddAccount).toHaveBeenCalledOnce();
  });

  it("previews a Venmo CSV selected in the file control", async () => {
    Object.defineProperty(window.crypto, "subtle", {
      configurable: true,
      value: webcrypto.subtle,
    });
    const venmoCsv = [
      "Account Statement - (@example),,,,,,,,,",
      "Account Activity,,,,,,,,,",
      ",ID,Datetime,Type,Status,Note,From,To,Amount (total),Beginning Balance",
      ",,,,,,,,,$100.00",
      ',1,2026-08-02T14:56:15,Standard Transfer,Issued,,,,"- $25.00",',
      ",2,2026-08-03T09:30:00,Payment,Complete,Dinner,Friend,Example,$12.50,",
    ].join("\n");
    const statement = new File([venmoCsv], "venmo-august.csv", {
      type: "text/csv",
    });

    render(
      <ImportDialog
        open
        onOpenChange={() => undefined}
        accounts={[
          {
            id: "venmo",
            name: "Venmo",
            institution: "Venmo",
            kind: "venmo",
            color: "#94A3B8",
          },
        ]}
        onAddAccount={() => undefined}
        onCommit={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Statement file"), {
      target: { files: [statement] },
    });

    expect(await screen.findByText("2 rows ready")).toBeTruthy();
    expect(screen.getByDisplayValue("Standard Transfer")).toBeTruthy();
    expect(screen.getByDisplayValue("Dinner")).toBeTruthy();
  });
});
