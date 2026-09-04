import { describe, expect, it } from "vitest";
import { computeMonthlySummary } from "./accounting";
import type { Category, Reconciliation, Transaction } from "./types";
import { demoData } from "@/lib/data/demo";

const categories: Category[] = [
  { id: "income", name: "Income", color: "#0f0", isIncome: true },
  { id: "fun", name: "Fun", color: "#f00" },
  { id: "other", name: "Other", color: "#aaa" },
];
const transactions: Transaction[] = [
  {
    id: "pay",
    accountId: "bank",
    occurredOn: "2026-06-01",
    descriptionRaw: "PAY",
    merchant: "Pay",
    amountCents: 100000,
    categoryId: "income",
    source: "import",
  },
  {
    id: "golf",
    accountId: "card",
    occurredOn: "2026-06-20",
    descriptionRaw: "GOLF",
    merchant: "Golf",
    amountCents: -40000,
    categoryId: "fun",
    source: "import",
  },
  {
    id: "v1",
    accountId: "venmo",
    occurredOn: "2026-07-01",
    descriptionRaw: "GOLF",
    merchant: "Alex",
    amountCents: 10000,
    categoryId: "other",
    source: "import",
  },
  {
    id: "v2",
    accountId: "venmo",
    occurredOn: "2026-07-02",
    descriptionRaw: "GOLF",
    merchant: "Sam",
    amountCents: 5000,
    categoryId: "other",
    source: "import",
  },
];
const reimbursement: Reconciliation = {
  id: "r",
  type: "reimbursement",
  status: "confirmed",
  confidence: 95,
  title: "Match",
  explanation: "Grouped",
  createdAt: "2026-07-02",
  members: [
    { transactionId: "golf", role: "anchor", allocationCents: 15000 },
    { transactionId: "v1", role: "offset", allocationCents: 10000 },
    { transactionId: "v2", role: "offset", allocationCents: 5000 },
  ],
};

describe("true-spending accounting", () => {
  it("matches the trusted September demo totals after reconciliation", () => {
    const confirmed = demoData.reconciliations.map((item) => ({
      ...item,
      status: "confirmed" as const,
    }));
    expect(
      computeMonthlySummary(
        "2026-09",
        demoData.transactions,
        confirmed,
        demoData.categories,
      ),
    ).toMatchObject({
      incomeCents: 784000,
      trueSpendCents: 549382,
      leftoverCents: 234618,
      reimbursementCents: 30000,
      completionPercent: 100,
    });
  });

  it("applies grouped partial reimbursements to the original purchase month", () => {
    const june = computeMonthlySummary(
      "2026-06",
      transactions,
      [reimbursement],
      categories,
    );
    expect(june).toMatchObject({
      incomeCents: 100000,
      trueSpendCents: 25000,
      reimbursementCents: 15000,
      leftoverCents: 75000,
    });
    expect(
      computeMonthlySummary(
        "2026-07",
        transactions,
        [reimbursement],
        categories,
      ).grossInflowCents,
    ).toBe(15000);
  });

  it("keeps unconfirmed suggestions out of adjusted totals", () => {
    expect(
      computeMonthlySummary(
        "2026-06",
        transactions,
        [{ ...reimbursement, status: "suggested" }],
        categories,
      ).trueSpendCents,
    ).toBe(40000);
  });

  it("excludes only the duplicate member and neutralizes transfers", () => {
    const extra: Transaction[] = [
      {
        id: "dup1",
        accountId: "bank",
        occurredOn: "2026-06-03",
        descriptionRaw: "SHOP",
        merchant: "Shop",
        amountCents: -1000,
        categoryId: "fun",
        source: "import",
      },
      {
        id: "dup2",
        accountId: "bank",
        occurredOn: "2026-06-03",
        descriptionRaw: "SHOP",
        merchant: "Shop",
        amountCents: -1000,
        categoryId: "fun",
        source: "import",
      },
      {
        id: "out",
        accountId: "bank",
        occurredOn: "2026-06-04",
        descriptionRaw: "TRANSFER",
        merchant: "Transfer",
        amountCents: -5000,
        categoryId: "other",
        source: "import",
      },
      {
        id: "in",
        accountId: "save",
        occurredOn: "2026-06-05",
        descriptionRaw: "TRANSFER",
        merchant: "Transfer",
        amountCents: 5000,
        categoryId: "other",
        source: "import",
      },
    ];
    const links: Reconciliation[] = [
      {
        id: "d",
        type: "duplicate",
        status: "confirmed",
        confidence: 99,
        title: "Dup",
        explanation: "",
        createdAt: "",
        members: [
          { transactionId: "dup1", role: "anchor", allocationCents: 1000 },
          { transactionId: "dup2", role: "duplicate", allocationCents: 1000 },
        ],
      },
      {
        id: "t",
        type: "transfer",
        status: "confirmed",
        confidence: 99,
        title: "Transfer",
        explanation: "",
        createdAt: "",
        members: [
          { transactionId: "out", role: "anchor", allocationCents: 5000 },
          { transactionId: "in", role: "offset", allocationCents: 5000 },
        ],
      },
    ];
    expect(
      computeMonthlySummary("2026-06", extra, links, categories).trueSpendCents,
    ).toBe(1000);
  });
});
