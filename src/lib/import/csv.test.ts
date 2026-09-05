import { describe, expect, it } from "vitest";
import { mapRows, parseCsvText, suggestMapping } from "./csv";

describe("CSV imports", () => {
  it("maps a signed amount format", () => {
    const parsed = parseCsvText(
      "Transaction Date,Description,Amount\n09/07/2026,Golf Club,-400.00\n09/08/2026,Payroll,2500.00",
    );
    const mapping = suggestMapping(parsed.meta.fields ?? []);
    expect(mapRows(parsed.data, mapping)).toMatchObject([
      {
        date: "2026-09-07",
        description: "Golf Club",
        amountCents: -40000,
        errors: [],
      },
      {
        date: "2026-09-08",
        description: "Payroll",
        amountCents: 250000,
        errors: [],
      },
    ]);
  });

  it("maps separate debit and credit columns", () => {
    const rows = [
      { Date: "9/7/26", Memo: "Round", Debit: "$400.00", Credit: "" },
      { Date: "9/8/26", Memo: "Deposit", Debit: "", Credit: "300.00" },
    ];
    expect(
      mapRows(rows, {
        date: "Date",
        description: "Memo",
        debit: "Debit",
        credit: "Credit",
      }).map((row) => row.amountCents),
    ).toEqual([-40000, 30000]);
  });

  it("detects and maps a Venmo statement with preamble rows", () => {
    const parsed = parseCsvText(
      [
        "Account Statement - (@example),,,,,,,,,",
        "Account Activity,,,,,,,,,",
        ",ID,Datetime,Type,Status,Note,From,To,Amount (total),Beginning Balance",
        ",,,,,,,,,$100.00",
        ',1,2026-08-02T14:56:15,Standard Transfer,Issued,,,,"- $25.00",',
        ",2,2026-08-03T09:30:00,Payment,Complete,Dinner,Friend,Example,$12.50,",
      ].join("\n"),
    );
    const mapping = suggestMapping(parsed.meta.fields ?? []);
    const candidates = mapRows(parsed.data, mapping);

    expect(mapping).toMatchObject({
      date: "Datetime",
      description: "Note",
      amount: "Amount (total)",
    });
    expect(candidates).toMatchObject([
      {
        date: "2026-08-02",
        description: "Standard Transfer",
        amountCents: -2500,
        errors: [],
      },
      {
        date: "2026-08-03",
        description: "Dinner",
        amountCents: 1250,
        errors: [],
      },
    ]);
  });
});
