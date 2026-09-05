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
});
