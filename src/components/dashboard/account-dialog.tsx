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
import type { Account, AccountKind } from "@/lib/finance/types";

export function AccountDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (account: Account) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [kind, setKind] = useState<AccountKind>("checking");
  const [last4, setLast4] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !institution.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        id: crypto.randomUUID(),
        name: name.trim(),
        institution: institution.trim(),
        kind,
        last4: last4 || undefined,
        color:
          kind === "venmo"
            ? "#94A3B8"
            : kind === "credit_card"
              ? "#3B82F6"
              : "#1B2A41",
      });
      setName("");
      setInstitution("");
      setLast4("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              Add a financial account
            </DialogTitle>
            <DialogDescription>
              Add the account label that appears on your statement. TrueSpend
              never asks for banking credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Everyday Card"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="Bank or payment app"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-kind">Type</Label>
              <select
                id="account-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as AccountKind)}
                className="field-control h-9 w-full rounded-lg border px-2 text-sm outline-none"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit_card">Credit card</option>
                <option value="venmo">Venmo</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="last4">Last four digits</Label>
              <Input
                id="last4"
                value={last4}
                onChange={(event) =>
                  setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="Optional"
                inputMode="numeric"
              />
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
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
            >
              {saving ? "Adding…" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
