import { describe, expect, it } from "vitest";
import { candidatesFromStatementText } from "./pdf";

describe("PDF text extraction", () => {
  it("turns searchable or OCR text lines into review candidates", () => {
    const candidates = candidatesFromStatementText(
      "09/07/2026 GREEN HILLS GOLF CLUB -$400.00\n09/08/2026 PAYROLL $2,500.00",
    );
    expect(candidates).toMatchObject([
      {
        date: "2026-09-07",
        description: "GREEN HILLS GOLF CLUB",
        amountCents: -40000,
      },
      { date: "2026-09-08", description: "PAYROLL", amountCents: 250000 },
    ]);
  });
});
