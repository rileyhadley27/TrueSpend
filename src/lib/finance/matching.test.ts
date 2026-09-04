import { describe, expect, it } from "vitest";
import { generateSuggestions } from "./matching";
import type { Account, Transaction } from "./types";

const accounts: Account[] = [
  {
    id: "card",
    name: "Card",
    institution: "A",
    kind: "credit_card",
    color: "#000",
  },
  {
    id: "bank",
    name: "Bank",
    institution: "B",
    kind: "checking",
    color: "#000",
  },
  {
    id: "venmo",
    name: "Venmo",
    institution: "Venmo",
    kind: "venmo",
    color: "#000",
  },
];
const tx = (
  value: Partial<Transaction> &
    Pick<Transaction, "id" | "accountId" | "occurredOn" | "amountCents">,
): Transaction => ({
  descriptionRaw: value.id,
  merchant: value.id,
  categoryId: "other",
  source: "import",
  ...value,
});

describe("ranked reconciliation suggestions", () => {
  it("groups multiple Venmo receipts against one expense", () => {
    const suggestions = generateSuggestions(
      [
        tx({
          id: "golf",
          accountId: "card",
          occurredOn: "2026-09-07",
          amountCents: -40000,
          descriptionRaw: "GREEN GOLF",
        }),
        tx({
          id: "a",
          accountId: "venmo",
          occurredOn: "2026-09-08",
          amountCents: 10000,
          descriptionRaw: "ALEX GOLF",
        }),
        tx({
          id: "b",
          accountId: "venmo",
          occurredOn: "2026-09-09",
          amountCents: 10000,
          descriptionRaw: "SAM GOLF",
        }),
      ],
      accounts,
    );
    expect(
      suggestions.find((item) => item.id.includes("group"))?.members,
    ).toHaveLength(3);
  });

  it("allocates one Venmo receipt across multiple matching purchases", () => {
    const suggestions = generateSuggestions(
      [
        tx({
          id: "golf-one",
          accountId: "card",
          occurredOn: "2026-09-07",
          amountCents: -12000,
          descriptionRaw: "GOLF ONE",
        }),
        tx({
          id: "golf-two",
          accountId: "card",
          occurredOn: "2026-09-08",
          amountCents: -8000,
          descriptionRaw: "GOLF TWO",
        }),
        tx({
          id: "receipt",
          accountId: "venmo",
          occurredOn: "2026-09-09",
          amountCents: 15000,
          descriptionRaw: "GOLF SPLIT",
        }),
      ],
      accounts,
    );
    const split = suggestions.find((item) => item.id.includes("split"));
    expect(
      split?.members.filter((member) => member.role === "anchor"),
    ).toHaveLength(2);
    expect(
      split?.members.reduce(
        (sum, member) =>
          member.role === "anchor" ? sum + member.allocationCents : sum,
        0,
      ),
    ).toBe(15000);
  });

  it("finds card payments, refunds, and source-id duplicates", () => {
    const transactions = [
      tx({
        id: "card-pay",
        accountId: "card",
        occurredOn: "2026-09-03",
        amountCents: 25000,
      }),
      tx({
        id: "bank-pay",
        accountId: "bank",
        occurredOn: "2026-09-01",
        amountCents: -25000,
      }),
      tx({
        id: "buy",
        accountId: "card",
        occurredOn: "2026-05-01",
        amountCents: -12000,
        merchant: "Store",
      }),
      tx({
        id: "refund",
        accountId: "bank",
        occurredOn: "2026-06-01",
        amountCents: 12000,
        merchant: "Store",
      }),
      tx({
        id: "d1",
        accountId: "bank",
        occurredOn: "2026-08-01",
        amountCents: -500,
        sourceExternalId: "same",
      }),
      tx({
        id: "d2",
        accountId: "card",
        occurredOn: "2026-08-20",
        amountCents: -900,
        sourceExternalId: "same",
      }),
    ];
    const types = generateSuggestions(transactions, accounts).map(
      (item) => item.type,
    );
    expect(types).toEqual(
      expect.arrayContaining(["card_payment", "refund", "duplicate"]),
    );
  });
});
