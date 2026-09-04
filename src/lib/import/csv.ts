import Papa from "papaparse";
import { z } from "zod";
import { parseMoney } from "@/lib/finance/money";

export interface ColumnMapping {
  date: string;
  description: string;
  amount?: string;
  debit?: string;
  credit?: string;
}

export interface ImportCandidate {
  rowNumber: number;
  date: string;
  description: string;
  amountCents: number;
  confidence: number;
  raw: Record<string, string>;
  errors: string[];
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function parseCsvText(text: string) {
  return Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const find = (...terms: string[]) =>
    headers.find((header) =>
      terms.some((term) => header.toLowerCase().includes(term)),
    ) ?? "";
  return {
    date: find("posted date", "transaction date", "date"),
    description: find("description", "merchant", "name", "memo"),
    amount: find("amount"),
    debit: find("debit", "withdrawal", "charge"),
    credit: find("credit", "deposit"),
  };
}

export function mapRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): ImportCandidate[] {
  return rows.map((raw, index) => {
    const errors: string[] = [];
    const date = normalizeDate(raw[mapping.date]);
    if (!date || !isoDate.safeParse(date).success) errors.push("Check date");
    const description = raw[mapping.description]?.trim() ?? "";
    if (!description) errors.push("Add description");
    let amountCents: number | null = null;
    if (mapping.amount) amountCents = parseMoney(raw[mapping.amount] ?? "");
    if (amountCents === null && (mapping.debit || mapping.credit)) {
      const debit = mapping.debit ? parseMoney(raw[mapping.debit] ?? "") : null;
      const credit = mapping.credit
        ? parseMoney(raw[mapping.credit] ?? "")
        : null;
      amountCents =
        credit !== null
          ? Math.abs(credit)
          : debit !== null
            ? -Math.abs(debit)
            : null;
    }
    if (amountCents === null || amountCents === 0) errors.push("Check amount");
    return {
      rowNumber: index + 2,
      date: date ?? "",
      description,
      amountCents: amountCents ?? 0,
      confidence: errors.length ? 55 : 100,
      raw,
      errors,
    };
  });
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}
