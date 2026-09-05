"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Landmark,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Account } from "@/lib/finance/types";
import {
  mapRows,
  parseCsvText,
  suggestMapping,
  type ColumnMapping,
  type ImportCandidate,
} from "@/lib/import/csv";
import { extractStatementPdf } from "@/lib/import/pdf";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  persisted?: boolean;
  onAddAccount: () => void;
  onCommit: (payload: {
    accountId: string;
    fileName: string;
    fileHash: string;
    file: File;
    candidates: ImportCandidate[];
    mapping?: ColumnMapping;
    headers?: string[];
  }) => void | Promise<void>;
}

export function ImportDialog({
  open,
  onOpenChange,
  accounts,
  persisted = false,
  onAddAccount,
  onCommit,
}: ImportDialogProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
  });
  const [pdfCandidates, setPdfCandidates] = useState<ImportCandidate[]>([]);
  const [candidateEdits, setCandidateEdits] = useState<
    Record<number, Partial<ImportCandidate>>
  >({});
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedAccountId = accountId || accounts[0]?.id || "";
  const candidates = useMemo(() => {
    const extracted = rawRows.length
      ? mapRows(rawRows, mapping)
      : pdfCandidates;
    return extracted.map((candidate, index) =>
      candidateEdits[index]
        ? {
            ...candidate,
            ...candidateEdits[index],
            errors: [],
            confidence: 100,
          }
        : candidate,
    );
  }, [rawRows, mapping, pdfCandidates, candidateEdits]);
  const validCount = candidates.filter(
    (candidate) => candidate.errors.length === 0,
  ).length;
  const statementAlreadyImported = error
    .toLowerCase()
    .includes("already imported");

  async function handleFile(selected?: File) {
    if (!selected) return;
    setFile(selected);
    setError("");
    setHeaders([]);
    setRawRows([]);
    setPdfCandidates([]);
    setCandidateEdits({});
    setProgress("Reading file…");
    if (selected.size > 20 * 1024 * 1024) {
      setError("Statements must be 20 MB or smaller.");
      setProgress("");
      return;
    }
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      await selected.arrayBuffer(),
    );
    setFileHash(
      Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    );
    try {
      if (
        selected.name.toLowerCase().endsWith(".csv") ||
        selected.type.includes("csv")
      ) {
        const result = parseCsvText(await selected.text());
        if (result.errors.length && !result.data.length)
          throw new Error(result.errors[0].message);
        const discoveredHeaders =
          result.meta.fields ?? Object.keys(result.data[0] ?? {});
        setHeaders(discoveredHeaders);
        setRawRows(result.data);
        let nextMapping = suggestMapping(discoveredHeaders);
        if (persisted && selectedAccountId) {
          const response = await fetch(
            `/api/import-presets?accountId=${encodeURIComponent(selectedAccountId)}&signature=${encodeURIComponent(discoveredHeaders.join("|"))}`,
          );
          if (response.ok) {
            const saved = await response.json();
            if (saved.mapping) nextMapping = saved.mapping;
          }
        }
        setMapping(nextMapping);
      } else if (
        selected.name.toLowerCase().endsWith(".pdf") ||
        selected.type === "application/pdf"
      ) {
        const result = await extractStatementPdf(selected, (message, amount) =>
          setProgress(`${message} · ${amount}%`),
        );
        setPdfCandidates(result.candidates);
        if (!result.candidates.length)
          setError(
            "No transaction rows were recognized. Try a CSV export or add the transactions manually.",
          );
      } else throw new Error("Choose a CSV or PDF statement.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This statement could not be read.",
      );
    } finally {
      setProgress("");
    }
  }

  function updateCandidate(
    index: number,
    field: "date" | "description" | "amountCents",
    value: string,
  ) {
    setCandidateEdits((current) => ({
      ...current,
      [index]: {
        ...current[index],
        [field]:
          field === "amountCents" ? Math.round(Number(value) * 100) : value,
      },
    }));
  }

  async function commit() {
    if (!file || !selectedAccountId || validCount === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await onCommit({
        accountId: selectedAccountId,
        fileName: file.name,
        fileHash,
        file,
        candidates: candidates.filter(
          (candidate) => candidate.errors.length === 0,
        ),
        mapping: rawRows.length ? mapping : undefined,
        headers: rawRows.length ? headers : undefined,
      });
      setFile(null);
      setHeaders([]);
      setRawRows([]);
      setPdfCandidates([]);
      setCandidateEdits({});
      setProgress("");
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The import could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl font-extrabold">
              Import a statement
            </DialogTitle>
            <DialogDescription>
              Statements need an account so Divvy knows where their transactions
              belong.
            </DialogDescription>
          </DialogHeader>
          <div className="mx-6 mb-6 grid min-h-60 place-items-center rounded-3xl border border-[#3B82F6]/15 bg-gradient-to-br from-[#E8F1FF] to-white p-7 text-center dark:from-[#152746] dark:to-[#111B2E]">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#3B82F6] text-white shadow-[0_12px_30px_rgba(59,130,246,.28)]">
                <Landmark className="size-6" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold tracking-[-.03em]">
                Add your first account
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                Give your bank, card, or Venmo account a label. No banking
                credentials are needed for statement imports.
              </p>
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onAddAccount();
                }}
                className="mt-5 h-11 rounded-xl bg-[#3B82F6] px-5 text-white hover:bg-[#2563EB]"
              >
                <Landmark /> Add your first account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-extrabold">
            Import a statement
          </DialogTitle>
          <DialogDescription>
            Divvy keeps the original facts and asks you to approve extracted
            rows before they reach your ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 pb-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="import-account">Account</Label>
              <select
                id="import-account"
                value={selectedAccountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="field-control h-10 w-full rounded-xl border px-3 text-sm outline-none"
              >
                <option value="">Choose an account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statement-file">Statement file</Label>
              <Input
                id="statement-file"
                type="file"
                accept=".csv,.pdf,text/csv,application/pdf"
                onChange={(event) => void handleFile(event.target.files?.[0])}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          {!file && (
            <label
              htmlFor="statement-file"
              className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[#94A3B8]/50 bg-[#F8FAFC] p-6 text-center transition hover:border-[#3B82F6] hover:bg-[#E8F1FF]/50 dark:bg-[#0F192A] dark:hover:bg-[#1B2A41]"
            >
              <span>
                <UploadCloud className="mx-auto size-8 text-[#3B82F6]" />
                <strong className="mt-3 block">
                  Drop in a CSV or PDF statement
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Searchable and scanned PDFs supported · 20 MB max
                </span>
              </span>
            </label>
          )}
          {progress && (
            <div className="flex items-center gap-3 rounded-2xl bg-[#E8F1FF] p-4 text-sm font-semibold text-[#1D4ED8] dark:bg-[#1B2A41] dark:text-[#93C5FD]">
              <LoaderCircle className="size-5 animate-spin" />
              {progress}
            </div>
          )}
          {error && (
            <Alert
              variant={statementAlreadyImported ? "default" : "destructive"}
              className={
                statementAlreadyImported
                  ? "border-[#3B82F6]/30 bg-[#E8F1FF] text-[#1D4ED8] dark:bg-[#1B2A41] dark:text-[#93C5FD]"
                  : undefined
              }
            >
              {statementAlreadyImported ? <CheckCircle2 /> : <AlertCircle />}
              <AlertTitle>
                {statementAlreadyImported
                  ? "Statement already imported"
                  : "Import needs attention"}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {file && !progress && (
            <div className="flex items-center justify-between rounded-2xl bg-[#E2E8F0]/60 p-4 dark:bg-[#1B2A41]">
              <div className="flex items-center gap-3">
                {file.name.endsWith(".pdf") ? (
                  <FileText className="text-[#3B82F6]" />
                ) : (
                  <FileSpreadsheet className="text-[#1B2A41]" />
                )}
                <div>
                  <p className="font-bold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB · fingerprint{" "}
                    {fileHash.slice(0, 10)}…
                  </p>
                </div>
              </div>
              {candidates.length > 0 && (
                <span className="flex items-center gap-1 text-sm font-bold text-[#2563EB]">
                  <CheckCircle2 className="size-4" />
                  {validCount} rows ready
                </span>
              )}
            </div>
          )}

          {rawRows.length > 0 && (
            <section>
              <div className="mb-3">
                <h3 className="font-extrabold">Map your columns</h3>
                <p className="text-sm text-muted-foreground">
                  We guessed the layout. Adjust anything that does not look
                  right.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["date", "description", "amount"] as const).map((field) => (
                  <div key={field}>
                    <Label className="mb-1.5 capitalize">{field}</Label>
                    <select
                      value={mapping[field] ?? ""}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      className="field-control h-9 w-full rounded-lg border px-2 text-sm outline-none"
                    >
                      <option value="">Not mapped</option>
                      {headers.map((header) => (
                        <option key={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}

          {candidates.length > 0 && (
            <section>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <h3 className="font-extrabold">Review extracted rows</h3>
                  <p className="text-sm text-muted-foreground">
                    Rows with issues stay out of the ledger.
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {candidates.length} detected
                </span>
              </div>
              <div className="max-h-72 overflow-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.slice(0, 100).map((candidate, index) => (
                      <TableRow key={`${candidate.rowNumber}-${index}`}>
                        <TableCell>
                          <Input
                            aria-label={`Date row ${candidate.rowNumber}`}
                            value={candidate.date}
                            onChange={(event) =>
                              updateCandidate(index, "date", event.target.value)
                            }
                            className="h-8 w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label={`Description row ${candidate.rowNumber}`}
                            value={candidate.description}
                            onChange={(event) =>
                              updateCandidate(
                                index,
                                "description",
                                event.target.value,
                              )
                            }
                            className="h-8 min-w-52"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label={`Amount row ${candidate.rowNumber}`}
                            type="number"
                            step="0.01"
                            value={(candidate.amountCents / 100).toFixed(2)}
                            onChange={(event) =>
                              updateCandidate(
                                index,
                                "amountCents",
                                event.target.value,
                              )
                            }
                            className="ml-auto h-8 w-28 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          {candidate.errors.length ? (
                            <span className="text-xs font-bold text-red-600">
                              {candidate.errors.join(", ")}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-[#2563EB]">
                              Ready
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </div>
        <DialogFooter className="rounded-b-3xl px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void commit()}
            disabled={
              !file || !selectedAccountId || validCount === 0 || submitting
            }
            className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          >
            {submitting
              ? "Saving securely…"
              : `Add ${validCount || ""} transactions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
