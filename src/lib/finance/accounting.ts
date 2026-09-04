import type {
  Category,
  MonthlySummary,
  Reconciliation,
  Transaction,
} from "./types";

function inMonth(date: string, month: string) {
  return date.slice(0, 7) === month;
}

export function computeMonthlySummary(
  month: string,
  transactions: Transaction[],
  reconciliations: Reconciliation[],
  categories: Category[],
): MonthlySummary {
  const confirmed = reconciliations.filter(
    (item) => item.status === "confirmed",
  );
  const neutralIds = new Set<string>();
  const excludedIds = new Set(
    transactions.filter((item) => item.excluded).map((item) => item.id),
  );
  const expenseOffsets = new Map<string, number>();

  for (const link of confirmed) {
    if (link.type === "transfer" || link.type === "card_payment") {
      link.members.forEach((member) => neutralIds.add(member.transactionId));
    }
    if (link.type === "duplicate") {
      link.members
        .filter((member) => member.role === "duplicate")
        .forEach((member) => excludedIds.add(member.transactionId));
    }
    if (link.type === "reimbursement" || link.type === "refund") {
      const anchors = link.members.filter((member) => member.role === "anchor");
      anchors.forEach((member) => {
        expenseOffsets.set(
          member.transactionId,
          (expenseOffsets.get(member.transactionId) ?? 0) +
            member.allocationCents,
        );
      });
      link.members
        .filter((member) => member.role === "offset")
        .forEach((member) => neutralIds.add(member.transactionId));
    }
  }

  const incomeCategoryIds = new Set(
    categories
      .filter((category) => category.isIncome)
      .map((category) => category.id),
  );
  let incomeCents = 0;
  let trueSpendCents = 0;
  let grossInflowCents = 0;
  let grossOutflowCents = 0;
  let reimbursementCents = 0;
  const categorySpend = new Map<string, number>();

  for (const transaction of transactions) {
    if (
      !inMonth(transaction.occurredOn, month) ||
      excludedIds.has(transaction.id)
    )
      continue;
    if (transaction.amountCents > 0)
      grossInflowCents += transaction.amountCents;
    if (transaction.amountCents < 0)
      grossOutflowCents += Math.abs(transaction.amountCents);
    if (neutralIds.has(transaction.id)) continue;
    if (
      transaction.amountCents > 0 &&
      incomeCategoryIds.has(transaction.categoryId)
    )
      incomeCents += transaction.amountCents;
    if (transaction.amountCents < 0) {
      const gross = Math.abs(transaction.amountCents);
      const offset = Math.min(gross, expenseOffsets.get(transaction.id) ?? 0);
      const personal = gross - offset;
      reimbursementCents += offset;
      trueSpendCents += personal;
      categorySpend.set(
        transaction.categoryId,
        (categorySpend.get(transaction.categoryId) ?? 0) + personal,
      );
    }
  }

  const monthlyTasks = reconciliations.filter((item) => {
    const anchor = item.members.find((member) => member.role === "anchor");
    return (
      transactions
        .find((transaction) => transaction.id === anchor?.transactionId)
        ?.occurredOn.slice(0, 7) === month
    );
  });
  const resolvedTasks = monthlyTasks.filter(
    (item) => item.status !== "suggested",
  ).length;
  const totalTasks = monthlyTasks.length;

  return {
    month,
    incomeCents,
    trueSpendCents,
    leftoverCents: incomeCents - trueSpendCents,
    grossInflowCents,
    grossOutflowCents,
    reimbursementCents,
    resolvedTasks,
    totalTasks,
    completionPercent:
      totalTasks === 0 ? 100 : Math.round((resolvedTasks / totalTasks) * 100),
    categorySpend: [...categorySpend.entries()]
      .map(([categoryId, amountCents]) => ({ categoryId, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents),
  };
}
