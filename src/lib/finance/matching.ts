import type { Account, Reconciliation, Transaction } from "./types";

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function generateSuggestions(
  transactions: Transaction[],
  accounts: Account[],
): Reconciliation[] {
  const suggestions: Reconciliation[] = [];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const seen = new Set<string>();

  for (const receipt of transactions.filter(
    (transaction) =>
      transaction.amountCents > 0 &&
      accountMap.get(transaction.accountId)?.kind === "venmo",
  )) {
    const receiptTokens = new Set(
      normalize(receipt.descriptionRaw)
        .split(" ")
        .filter((token) => token.length > 3),
    );
    const expenses = transactions.filter((candidate) => {
      const relativeDays = daysBetween(
        candidate.occurredOn,
        receipt.occurredOn,
      );
      return (
        candidate.amountCents < 0 &&
        relativeDays >= -3 &&
        relativeDays <= 30 &&
        normalize(`${candidate.merchant} ${candidate.descriptionRaw}`)
          .split(" ")
          .some((token) => receiptTokens.has(token))
      );
    });
    const available = expenses.reduce(
      (sum, expense) => sum + Math.abs(expense.amountCents),
      0,
    );
    if (expenses.length >= 2 && receipt.amountCents <= available) {
      let remaining = receipt.amountCents;
      const anchors = expenses
        .map((expense) => {
          const allocationCents = Math.min(
            remaining,
            Math.abs(expense.amountCents),
          );
          remaining -= allocationCents;
          return {
            transactionId: expense.id,
            role: "anchor" as const,
            allocationCents,
          };
        })
        .filter((member) => member.allocationCents > 0);
      if (anchors.length >= 2 && remaining === 0) {
        suggestions.push({
          id: `suggestion-reimbursement-split-${receipt.id}`,
          type: "reimbursement",
          status: "suggested",
          confidence: 88,
          title: `Split one Venmo payment across ${anchors.length} purchases`,
          explanation:
            "The payment memo overlaps multiple purchases; the proposed allocations add up exactly to the receipt.",
          createdAt: new Date().toISOString(),
          members: [
            ...anchors,
            {
              transactionId: receipt.id,
              role: "offset",
              allocationCents: receipt.amountCents,
            },
          ],
        });
        anchors.forEach((member) =>
          seen.add([member.transactionId, receipt.id].sort().join(":")),
        );
      }
    }
  }

  for (const expense of transactions.filter(
    (transaction) => transaction.amountCents < 0,
  )) {
    const venmoReceipts = transactions.filter((candidate) => {
      const relativeDays = daysBetween(
        expense.occurredOn,
        candidate.occurredOn,
      );
      return (
        candidate.amountCents > 0 &&
        accountMap.get(candidate.accountId)?.kind === "venmo" &&
        relativeDays >= -3 &&
        relativeDays <= 30
      );
    });
    const expenseTokens = new Set(
      normalize(`${expense.merchant} ${expense.descriptionRaw}`)
        .split(" ")
        .filter((token) => token.length > 3),
    );
    const affordable = venmoReceipts.filter(
      (candidate) => candidate.amountCents < Math.abs(expense.amountCents),
    );
    const matchingReceipts = affordable.filter(
      (candidate) =>
        !seen.has([expense.id, candidate.id].sort().join(":")) &&
        normalize(candidate.descriptionRaw)
          .split(" ")
          .some((token) => expenseTokens.has(token)),
    );
    const total = matchingReceipts.reduce(
      (sum, candidate) => sum + candidate.amountCents,
      0,
    );
    if (
      matchingReceipts.length >= 2 &&
      total > 0 &&
      total <= Math.abs(expense.amountCents)
    ) {
      const noteMatches = matchingReceipts.length;
      if (noteMatches > 0) {
        suggestions.push({
          id: `suggestion-reimbursement-group-${expense.id}`,
          type: "reimbursement",
          status: "suggested",
          confidence: Math.min(98, 88 + noteMatches * 3),
          title: `Match ${matchingReceipts.length} Venmo payments`,
          explanation: `The payment notes overlap this purchase and total ${(total / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}.`,
          createdAt: new Date().toISOString(),
          members: [
            {
              transactionId: expense.id,
              role: "anchor",
              allocationCents: total,
            },
            ...matchingReceipts.map((candidate) => ({
              transactionId: candidate.id,
              role: "offset" as const,
              allocationCents: candidate.amountCents,
            })),
          ],
        });
        matchingReceipts.forEach((candidate) =>
          seen.add([expense.id, candidate.id].sort().join(":")),
        );
      }
    }
  }

  for (let i = 0; i < transactions.length; i += 1) {
    const left = transactions[i];
    for (let j = i + 1; j < transactions.length; j += 1) {
      const right = transactions[j];
      const pairKey = [left.id, right.id].sort().join(":");
      if (seen.has(pairKey)) continue;
      const dateDistance = Math.abs(
        daysBetween(left.occurredOn, right.occurredOn),
      );
      const sameAmount =
        Math.abs(left.amountCents) === Math.abs(right.amountCents);

      const matchingSourceId = Boolean(
        left.sourceExternalId &&
          left.sourceExternalId === right.sourceExternalId,
      );
      const matchingFingerprint = Boolean(
        left.sourceFingerprint &&
          left.sourceFingerprint === right.sourceFingerprint,
      );
      if (
        matchingSourceId ||
        matchingFingerprint ||
        (left.accountId === right.accountId &&
          left.amountCents === right.amountCents &&
          dateDistance <= 1 &&
          normalize(left.descriptionRaw) === normalize(right.descriptionRaw))
      ) {
        suggestions.push(
          makeSuggestion(
            "duplicate",
            matchingSourceId ? 100 : 99,
            "Possible duplicate",
            matchingSourceId
              ? "The source transaction identifier appears more than once."
              : matchingFingerprint
                ? "The account, date, amount, and description fingerprint appears more than once."
                : "Same account, amount, date, and description.",
            left,
            right,
            "duplicate",
          ),
        );
        seen.add(pairKey);
        continue;
      }

      if (
        left.accountId !== right.accountId &&
        left.amountCents === -right.amountCents &&
        dateDistance <= 5
      ) {
        const leftAccount = accountMap.get(left.accountId);
        const rightAccount = accountMap.get(right.accountId);
        const isCardPayment =
          leftAccount?.kind === "credit_card" ||
          rightAccount?.kind === "credit_card";
        suggestions.push(
          makeSuggestion(
            isCardPayment ? "card_payment" : "transfer",
            97,
            isCardPayment ? "Possible card payment" : "Possible transfer",
            `Equal and opposite amounts posted ${dateDistance} day${dateDistance === 1 ? "" : "s"} apart.`,
            left,
            right,
          ),
        );
        seen.add(pairKey);
        continue;
      }

      const expense =
        left.amountCents < 0 ? left : right.amountCents < 0 ? right : null;
      const inflow =
        left.amountCents > 0 ? left : right.amountCents > 0 ? right : null;
      if (!expense || !inflow) continue;
      const inflowAccount = accountMap.get(inflow.accountId);
      const relativeDays = daysBetween(expense.occurredOn, inflow.occurredOn);

      if (
        inflowAccount?.kind === "venmo" &&
        relativeDays >= -3 &&
        relativeDays <= 30 &&
        inflow.amountCents <= Math.abs(expense.amountCents)
      ) {
        const confidence = sameAmount ? 94 : 82;
        suggestions.push(
          makeSuggestion(
            "reimbursement",
            confidence,
            "Possible reimbursement",
            `Venmo receipt arrived ${Math.abs(relativeDays)} day${Math.abs(relativeDays) === 1 ? "" : "s"} from this purchase.`,
            expense,
            inflow,
          ),
        );
        seen.add(pairKey);
      } else if (
        relativeDays >= 0 &&
        relativeDays <= 120 &&
        normalize(expense.merchant) === normalize(inflow.merchant)
      ) {
        suggestions.push(
          makeSuggestion(
            "refund",
            sameAmount ? 95 : 80,
            "Possible refund",
            "Incoming payment shares the original merchant and falls within 120 days.",
            expense,
            inflow,
          ),
        );
        seen.add(pairKey);
      }
    }
  }
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function makeSuggestion(
  type: Reconciliation["type"],
  confidence: number,
  title: string,
  explanation: string,
  anchor: Transaction,
  offset: Transaction,
  offsetRole: "offset" | "duplicate" = "offset",
): Reconciliation {
  const allocationCents = Math.min(
    Math.abs(anchor.amountCents),
    Math.abs(offset.amountCents),
  );
  return {
    id: `suggestion-${type}-${anchor.id}-${offset.id}`,
    type,
    status: "suggested",
    confidence,
    title,
    explanation,
    createdAt: new Date().toISOString(),
    members: [
      { transactionId: anchor.id, role: "anchor", allocationCents },
      { transactionId: offset.id, role: offsetRole, allocationCents },
    ],
  };
}
