"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Category } from "@/lib/finance/types";

export function CategoryDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (category: Category) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7657ff");
  const [isIncome, setIsIncome] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onAdd({
        id: crypto.randomUUID(),
        name: name.trim(),
        color,
        isIncome,
      });
      setName("");
      setIsIncome(false);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The category could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a category</DialogTitle>
          <DialogDescription>
            Use it now and for future merchant rules.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="category-color">Color</Label>
            <Input
              id="category-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-11"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Checkbox
              checked={isIncome}
              onCheckedChange={(checked) => setIsIncome(checked === true)}
            />
            Treat positive transactions as income
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={!name.trim() || saving}
            className="bg-[#7657ff] text-white"
          >
            {saving ? "Saving…" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
