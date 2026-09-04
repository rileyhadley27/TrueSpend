"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Account, Category, Transaction } from "@/lib/finance/types";

export function ManualDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  onAdd: (transaction: Transaction) => void;
}) {
  const [date, setDate] = useState("2026-09-22");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.kind === "cash")?.id ??
      accounts[0]?.id ??
      "",
  );
  const [categoryId, setCategoryId] = useState(
    categories.find((category) => !category.isIncome)?.id ?? "other",
  );
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents === 0) return;
    onAdd({
      id: crypto.randomUUID(),
      accountId,
      occurredOn: date,
      descriptionRaw: description.trim().toUpperCase(),
      merchant: description.trim(),
      amountCents: cents,
      categoryId,
      source: "manual",
    });
    setDescription("");
    setAmount("");
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              Add a transaction
            </DialogTitle>
            <DialogDescription>
              Manual entries are clearly labeled and can be changed or removed
              later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-amount">Amount</Label>
              <Input
                id="manual-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Use - for spending"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="manual-description">Description</Label>
              <Input
                id="manual-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Coffee, cash tip, farmers market…"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-account">Account</Label>
              <select
                id="manual-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="h-9 w-full rounded-lg border bg-white px-2 text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-category">Category</Label>
              <select
                id="manual-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-9 w-full rounded-lg border bg-white px-2 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#7657ff] text-white">
              Add to ledger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
