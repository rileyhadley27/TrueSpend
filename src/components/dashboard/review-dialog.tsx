"use client";

import { ArrowDownLeft, ArrowUpRight, Link2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Account, Reconciliation, Transaction } from "@/lib/finance/types";
import { formatMoney } from "@/lib/finance/money";

export function ReviewDialog({
  reconciliation,
  transactions,
  accounts,
  onClose,
  onDecision,
}: {
  reconciliation: Reconciliation | null;
  transactions: Transaction[];
  accounts: Account[];
  onClose: () => void;
  onDecision: (status: Reconciliation["status"]) => void;
}) {
  if (!reconciliation) return null;
  const rows = reconciliation.members
    .map((member) => ({
      member,
      transaction: transactions.find(
        (item) => item.id === member.transactionId,
      ),
    }))
    .filter((row) => row.transaction);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-[#E8F1FF] text-[#1D4ED8] dark:bg-[#1B2A41] dark:text-[#93C5FD]">
              {reconciliation.confidence}% confidence
            </Badge>
            <Badge variant="outline" className="capitalize">
              {reconciliation.type.replace("_", " ")}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-extrabold">
            {reconciliation.title}
          </DialogTitle>
          <DialogDescription>{reconciliation.explanation}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-3">
          {rows.map(({ member, transaction }) => {
            const account = accounts.find(
              (item) => item.id === transaction!.accountId,
            );
            return (
              <div
                key={transaction!.id}
                className="flex items-center gap-3 rounded-2xl border bg-[#F8FAFC] p-4 dark:bg-[#0F192A]"
              >
                <span
                  className={`grid size-9 place-items-center rounded-xl ${transaction!.amountCents > 0 ? "bg-[#E8F1FF] text-[#2563EB]" : "bg-[#E2E8F0] text-[#1B2A41]"}`}
                >
                  {transaction!.amountCents > 0 ? (
                    <ArrowDownLeft className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{transaction!.merchant}</p>
                  <p className="text-xs text-muted-foreground">
                    {account?.name} · {transaction!.occurredOn} · {member.role}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-extrabold ${transaction!.amountCents > 0 ? "text-[#2563EB]" : ""}`}
                  >
                    {formatMoney(transaction!.amountCents, { sign: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    allocated {formatMoney(member.allocationCents)}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#E8F1FF] p-4 text-sm text-[#1D4ED8] dark:bg-[#1B2A41] dark:text-[#93C5FD]">
            <Link2 className="size-4" />
            <span>
              <strong>Reporting effect:</strong>{" "}
              {reconciliation.type === "reimbursement"
                ? "Apply the repayment to the original purchase month."
                : reconciliation.type === "duplicate"
                  ? "Keep both source records and exclude one from totals."
                  : "Keep the cash entries visible and remove them from true spending."}
            </span>
          </div>
        </div>
        <DialogFooter>
          {reconciliation.status === "confirmed" ? (
            <Button variant="outline" onClick={() => onDecision("suggested")}>
              <RotateCcw /> Undo confirmation
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onDecision("dismissed")}>
                Not a match
              </Button>
              <Button
                className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                onClick={() => onDecision("confirmed")}
              >
                Confirm match
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
