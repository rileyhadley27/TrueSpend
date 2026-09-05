"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Landmark,
  LayoutDashboard,
  ListFilter,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DivvyLogo } from "@/components/brand/divvy-logo";
import { ImportDialog } from "./import-dialog";
import { AccountDialog } from "./account-dialog";
import { ManualDialog } from "./manual-dialog";
import { ReviewDialog } from "./review-dialog";
import { CategoryDialog } from "./category-dialog";
import { ProfileMenu } from "./profile-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeMonthlySummary } from "@/lib/finance/accounting";
import { formatMoney } from "@/lib/finance/money";
import type {
  DashboardData,
  Reconciliation,
  Transaction,
} from "@/lib/finance/types";
import type { ImportCandidate } from "@/lib/import/csv";

type View = "overview" | "transactions" | "reports";

export function DivvyDashboard({
  initialData,
  demoMode = false,
  userName = "Riley",
  userEmail = "riley@example.com",
  isAdmin = false,
}: {
  initialData: DashboardData;
  demoMode?: boolean;
  userName?: string;
  userEmail?: string;
  isAdmin?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("overview");
  const [month, setMonth] = useState(
    initialData.transactions[0]?.occurredOn.slice(0, 7) ??
      new Date().toISOString().slice(0, 7),
  );
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [reviewing, setReviewing] = useState<Reconciliation | null>(null);
  const [cashView, setCashView] = useState(false);
  const summary = useMemo(
    () =>
      computeMonthlySummary(
        month,
        data.transactions,
        data.reconciliations,
        data.categories,
      ),
    [month, data],
  );
  const tasks = data.reconciliations.filter(
    (item) => item.status === "suggested",
  );
  const monthLabel = new Date(`${month}-02T12:00:00`).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  const filteredTransactions = data.transactions.filter(
    (transaction) =>
      transaction.occurredOn.startsWith(month) &&
      `${transaction.merchant} ${transaction.descriptionRaw}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const chartData = summary.categorySpend.slice(0, 6).map((item) => ({
    name:
      data.categories.find((category) => category.id === item.categoryId)
        ?.name ?? "Other",
    amount: item.amountCents / 100,
  }));

  async function decide(status: Reconciliation["status"]) {
    if (!reviewing) return;
    const previous = reviewing.status;
    setData((current) => ({
      ...current,
      reconciliations: current.reconciliations.map((item) =>
        item.id === reviewing.id ? { ...item, status } : item,
      ),
    }));
    if (!demoMode) {
      const response = await fetch(`/api/reconciliations/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setData((current) => ({
          ...current,
          reconciliations: current.reconciliations.map((item) =>
            item.id === reviewing.id ? { ...item, status: previous } : item,
          ),
        }));
      }
    }
    setReviewing(null);
  }

  async function addManual(transaction: Transaction) {
    setData((current) => ({
      ...current,
      transactions: [transaction, ...current.transactions],
    }));
    if (!demoMode) {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: transaction.accountId,
          occurredOn: transaction.occurredOn,
          merchant: transaction.merchant,
          amountCents: transaction.amountCents,
          categoryId: transaction.categoryId,
          note: transaction.note,
        }),
      });
      if (!response.ok)
        setData((current) => ({
          ...current,
          transactions: current.transactions.filter(
            (item) => item.id !== transaction.id,
          ),
        }));
    }
  }
  async function addAccount(account: DashboardData["accounts"][number]) {
    setData((current) => ({
      ...current,
      accounts: [...current.accounts, account],
    }));
    if (!demoMode) {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setData((current) => ({
          ...current,
          accounts: current.accounts.filter((item) => item.id !== account.id),
        }));
        throw new Error(result.error ?? "The account could not be added.");
      }
      setData((current) => ({
        ...current,
        accounts: current.accounts.map((item) =>
          item.id === account.id ? { ...item, id: result.id } : item,
        ),
      }));
    }
  }
  async function addCategory(category: DashboardData["categories"][number]) {
    setData((current) => ({
      ...current,
      categories: [...current.categories, category],
    }));
    if (!demoMode) {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setData((current) => ({
          ...current,
          categories: current.categories.filter(
            (item) => item.id !== category.id,
          ),
        }));
        throw new Error(result.error ?? "The category could not be added.");
      }
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id ? { ...item, id: result.id } : item,
        ),
      }));
    }
  }
  async function changeCategory(transactionId: string, categoryId: string) {
    const original = data.transactions.find(
      (item) => item.id === transactionId,
    )?.categoryId;
    setData((current) => ({
      ...current,
      transactions: current.transactions.map((item) =>
        item.id === transactionId ? { ...item, categoryId } : item,
      ),
    }));
    if (!demoMode) {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, rememberMerchant: true }),
      });
      if (!response.ok && original)
        setData((current) => ({
          ...current,
          transactions: current.transactions.map((item) =>
            item.id === transactionId
              ? { ...item, categoryId: original }
              : item,
          ),
        }));
    }
  }
  async function commitImport({
    accountId,
    candidates,
    fileName,
    fileHash,
    file,
    mapping,
    headers,
  }: {
    accountId: string;
    fileName: string;
    fileHash: string;
    file: File;
    candidates: ImportCandidate[];
    mapping?: unknown;
    headers?: string[];
  }) {
    const imported: Transaction[] = candidates.map((candidate) => ({
      id: crypto.randomUUID(),
      accountId,
      occurredOn: candidate.date,
      descriptionRaw: candidate.description,
      merchant: candidate.description,
      amountCents: candidate.amountCents,
      categoryId: candidate.amountCents > 0 ? "other" : "other",
      source: "import",
    }));
    if (!demoMode) {
      const form = new FormData();
      form.set("accountId", accountId);
      form.set("fileName", fileName);
      form.set("fileHash", fileHash);
      form.set("file", file);
      form.set("candidates", JSON.stringify(candidates));
      if (mapping) form.set("mapping", JSON.stringify(mapping));
      if (headers) form.set("headerSignature", headers.join("|"));
      const response = await fetch("/api/imports", {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "The import could not be saved.");
      }
      window.location.reload();
      return;
    }
    setData((current) => ({
      ...current,
      transactions: [...imported, ...current.transactions],
    }));
    if (imported[0]) setMonth(imported[0].occurredOn.slice(0, 7));
  }

  return (
    <div className="min-h-screen text-[#0A0F1E] dark:text-[#E2E8F0]">
      <Header
        view={view}
        setView={setView}
        userName={userName}
        userEmail={userEmail}
        demoMode={demoMode}
        isAdmin={isAdmin}
        accounts={data.accounts}
        onConnectAccount={() => setAccountOpen(true)}
      />
      <section className="dashboard-stage relative -mt-[76px] overflow-hidden bg-[#0A0F1E] pt-[132px] text-white">
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -right-24 top-4 size-[34rem] rounded-full bg-[#3B82F6]/20 blur-[110px]" />
        <div className="pointer-events-none absolute -left-48 bottom-0 size-[28rem] rounded-full bg-[#1B2A41] blur-[90px]" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 pb-32 lg:grid-cols-[1.14fr_.86fr] lg:items-end lg:px-8 lg:pb-36">
          <div className="enter-up max-w-3xl">
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#94A3B8]">
              <Sparkles className="size-3.5" />
              {view === "overview"
                ? `Welcome back, ${userName}`
                : "Financial command center"}
            </div>
            <h1 className="display-heading text-5xl leading-[.92] sm:text-6xl lg:text-[5.25rem]">
              {view === "overview" ? (
                <>
                  Every dollar. <br />
                  <span className="text-[#60A5FA]">One true picture.</span>
                </>
              ) : view === "transactions" ? (
                <>
                  Every transaction. <br />
                  <span className="text-[#60A5FA]">Nothing lost.</span>
                </>
              ) : (
                <>
                  The month, <br />
                  <span className="text-[#60A5FA]">finally adding up.</span>
                </>
              )}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-[#94A3B8] sm:text-lg">
              {view === "overview"
                ? `Divvy connects repayments, transfers, and statements so ${monthLabel} reflects what you actually spent.`
                : view === "transactions"
                  ? "Search the ledger without losing the original statement facts."
                  : "Switch between adjusted spending and real cash movement."}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#E2E8F0]">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#60A5FA]" />
                Original records preserved
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#60A5FA]" />
                Every adjustment auditable
              </span>
            </div>
          </div>
          <div className="enter-up-delayed rounded-[30px] border border-white/10 bg-white/[.065] p-4 shadow-[0_32px_90px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:p-5">
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[.055] p-4">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#94A3B8]">
                  Reconciled
                </p>
                <p className="mt-2 text-3xl font-bold tracking-[-.05em]">
                  {summary.completionPercent}%
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#3B82F6] p-4 shadow-[0_16px_40px_rgba(59,130,246,.25)]">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/70">
                  Ready to review
                </p>
                <p className="mt-2 text-3xl font-bold tracking-[-.05em]">
                  {tasks.length}
                </p>
              </div>
            </div>
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#94A3B8]">
                Quick actions
              </p>
              <span className="text-xs font-semibold text-[#60A5FA]">
                {monthLabel}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-sm font-semibold text-white transition hover:bg-white/12">
                <CalendarDays className="size-4" />
                <input
                  aria-label="Reporting month"
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="min-w-0 bg-transparent text-white outline-none [color-scheme:dark]"
                />
              </label>
              <Button
                variant="outline"
                onClick={() => setCategoryOpen(true)}
                className="h-11 rounded-xl border-white/10 bg-white/8 px-4 text-white hover:bg-white/14 hover:text-white"
              >
                Add category
              </Button>
              <Button
                variant="outline"
                onClick={() => setAccountOpen(true)}
                className="h-11 rounded-xl border-white/10 bg-white/8 px-4 text-white hover:bg-white/14 hover:text-white"
              >
                <Landmark /> Add account
              </Button>
              <Button
                variant="outline"
                onClick={() => setManualOpen(true)}
                disabled={!data.accounts.length}
                className="h-11 rounded-xl border-white/10 bg-white/8 px-4 text-white hover:bg-white/14 hover:text-white"
              >
                <Plus /> Add transaction
              </Button>
              <Button
                onClick={() => setImportOpen(true)}
                disabled={!data.accounts.length}
                className="h-11 rounded-xl bg-white px-4 text-[#0A0F1E] shadow-[0_12px_30px_rgba(0,0,0,.2)] hover:bg-[#E2E8F0] sm:col-span-2"
              >
                <Upload /> Import statement
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-20 max-w-[1320px] px-5 pb-28 lg:px-8">
        {view === "overview" && (
          <Overview
            summary={summary}
            tasks={tasks}
            data={data}
            onReview={setReviewing}
            chartData={chartData}
            monthLabel={monthLabel}
          />
        )}
        {view === "transactions" && (
          <TransactionsView
            transactions={filteredTransactions}
            data={data}
            query={query}
            setQuery={setQuery}
            onCategoryChange={changeCategory}
          />
        )}
        {view === "reports" && (
          <ReportsView
            summary={summary}
            chartData={chartData}
            cashView={cashView}
            setCashView={setCashView}
            monthLabel={monthLabel}
          />
        )}
      </main>
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={data.accounts}
        persisted={!demoMode}
        onCommit={commitImport}
      />
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onAdd={addAccount}
      />
      <CategoryDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        onAdd={addCategory}
      />
      <ManualDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        accounts={data.accounts}
        categories={data.categories}
        onAdd={addManual}
      />
      <ReviewDialog
        reconciliation={reviewing}
        transactions={data.transactions}
        accounts={data.accounts}
        onClose={() => setReviewing(null)}
        onDecision={(status) => void decide(status)}
      />
    </div>
  );
}

function Header({
  view,
  setView,
  userName,
  userEmail,
  demoMode,
  isAdmin,
  accounts,
  onConnectAccount,
}: {
  view: View;
  setView: (view: View) => void;
  userName: string;
  userEmail: string;
  demoMode: boolean;
  isAdmin: boolean;
  accounts: DashboardData["accounts"];
  onConnectAccount: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 md:px-5">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between rounded-2xl border border-white/10 bg-[#0A0F1E]/72 px-3 text-white shadow-[0_18px_50px_rgba(10,15,30,.24)] backdrop-blur-2xl sm:px-5">
        <button
          onClick={() => setView("overview")}
          className="flex items-center gap-3"
        >
          <DivvyLogo className="size-9 shadow-[0_8px_20px_rgba(59,130,246,.28)] ring-1 ring-white/10" />
          <span className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
            Divvy
          </span>
          {demoMode && <Badge variant="secondary">Demo</Badge>}
        </button>
        <nav
          className="hidden items-center gap-1 rounded-xl bg-white/6 p-1 ring-1 ring-white/6 md:flex"
          aria-label="Primary navigation"
        >
          {(
            [
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "transactions", label: "Transactions", icon: ReceiptText },
              { id: "reports", label: "Reports", icon: ClipboardCheck },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${view === item.id ? "bg-[#3B82F6] text-white shadow-[0_6px_18px_rgba(59,130,246,.25)]" : "text-[#94A3B8] hover:bg-white/6 hover:text-white"}`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#94A3B8] transition hover:bg-white/6 hover:text-white"
            >
              <ShieldCheck className="size-4" />
              Approvals
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="text-[#94A3B8] hover:bg-white/8 hover:text-white"
          >
            <Bell />
          </Button>
          <ProfileMenu
            userName={userName}
            userEmail={userEmail}
            isAdmin={isAdmin}
            demoMode={demoMode}
            accounts={accounts}
            onConnectAccount={onConnectAccount}
          />
        </div>
      </div>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl bg-[#0A0F1E]/96 p-1.5 text-white shadow-[0_18px_50px_rgba(10,15,30,.28)] ring-1 ring-white/10 backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        {(["overview", "transactions", "reports"] as View[]).map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold capitalize transition ${view === item ? "bg-[#3B82F6] text-white" : "text-[#94A3B8]"}`}
          >
            {item}
          </button>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex-1 rounded-xl py-2.5 text-center text-xs font-semibold text-[#94A3B8]"
          >
            Approvals
          </Link>
        )}
      </nav>
    </header>
  );
}

function Overview({
  summary,
  tasks,
  data,
  onReview,
  chartData,
  monthLabel,
}: {
  summary: ReturnType<typeof computeMonthlySummary>;
  tasks: Reconciliation[];
  data: DashboardData;
  onReview: (item: Reconciliation) => void;
  chartData: Array<{ name: string; amount: number }>;
  monthLabel: string;
}) {
  return (
    <>
      <section className="enter-up-delayed grid gap-5 lg:grid-cols-[1.55fr_0.8fr]">
        <Card className="relative overflow-hidden rounded-[32px] border-0 bg-[linear-gradient(135deg,#3B82F6_0%,#2563EB_58%,#1B2A41_145%)] py-0 text-white shadow-[0_32px_90px_rgba(37,99,235,.28)] ring-0">
          <div className="pointer-events-none absolute -right-24 -top-36 size-[28rem] rounded-full bg-white/16 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 size-64 rounded-full bg-[#0A0F1E]/30 blur-3xl" />
          <CardContent className="relative grid min-h-[350px] gap-8 p-7 md:grid-cols-[1fr_230px] md:p-10">
            <div className="flex flex-col justify-between">
              <div>
                <Badge className="border border-white/15 bg-white/12 px-3 py-1.5 text-white">
                  {monthLabel.toUpperCase()}
                </Badge>
                <p className="mt-9 text-sm font-medium text-white/55">
                  Available after true spend
                </p>
                <p className="mt-1 text-5xl font-extrabold tracking-[-0.06em] sm:text-6xl">
                  {formatMoney(summary.leftoverCents)}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
                  <span className="rounded-full bg-white/14 px-2.5 py-1 font-bold text-white">
                    True view
                  </span>
                  <span>
                    {formatMoney(summary.reimbursementCents)} in repayments
                    recognized
                  </span>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-5 border-t border-white/10 pt-6">
                <Metric
                  label="Income"
                  value={formatMoney(summary.incomeCents)}
                />
                <Metric
                  label="True spend"
                  value={formatMoney(summary.trueSpendCents)}
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div
                className="relative grid size-[190px] place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#ffffff 0 ${summary.completionPercent}%, rgba(255,255,255,.16) ${summary.completionPercent}% 100%)`,
                }}
              >
                <div className="grid size-[142px] place-items-center rounded-full bg-[#2563EB] text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.12),0_14px_30px_rgba(10,15,30,.18)]">
                  <div>
                    <p className="text-4xl font-extrabold">
                      {summary.completionPercent}%
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[.13em] text-white/45">
                      reconciled
                    </p>
                  </div>
                </div>
                {summary.completionPercent === 100 && (
                  <span className="absolute -right-1 top-7 grid size-9 place-items-center rounded-full bg-white text-[#2563EB] shadow-lg">
                    <Check className="size-5 stroke-[3]" />
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card overflow-hidden rounded-[32px] bg-gradient-to-br from-white to-[#E8F1FF]/55 py-0 dark:from-[#111B2E] dark:to-[#152746]">
          <CardContent className="flex h-full flex-col p-7 sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  True spend insight
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  Repayments found
                </h2>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-[#3B82F6] text-white shadow-[0_8px_22px_rgba(59,130,246,.25)]">
                <WalletCards />
              </span>
            </div>
            <div className="mt-7 rounded-2xl bg-[#E2E8F0]/65 p-5 ring-1 ring-[#94A3B8]/15 dark:bg-[#1B2A41]">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Statement spending</span>
                <span className="font-bold">
                  {formatMoney(
                    summary.trueSpendCents + summary.reimbursementCents,
                  )}
                </span>
              </div>
              <div className="my-4 h-px bg-[#94A3B8]/25" />
              <div className="flex justify-between text-sm text-[#2563EB]">
                <span>Confirmed repayments</span>
                <span className="font-bold">
                  −{formatMoney(summary.reimbursementCents)}
                </span>
              </div>
            </div>
            <div className="mt-auto flex items-end justify-between pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#64748B] dark:text-[#94A3B8]">
                  True spend
                </p>
                <p className="mt-1 text-3xl font-extrabold">
                  {formatMoney(summary.trueSpendCents)}
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-white text-[#1B2A41] dark:bg-[#111B2E] dark:text-[#E2E8F0]"
              >
                Auditable
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="mt-10 grid gap-7 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-2">Suggested matches</p>
              <h2 className="text-2xl font-bold tracking-[-0.035em]">
                Reconciliation inbox
              </h2>
              <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
                Every match waits for your approval.
              </p>
            </div>
            <Badge variant="secondary">{tasks.length} open</Badge>
          </div>
          <div className="space-y-3">
            {tasks.length ? (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  data={data}
                  onReview={() => onReview(task)}
                />
              ))
            ) : (
              <div className="surface-card grid min-h-48 place-items-center rounded-3xl border border-dashed text-center">
                <div>
                  <FileCheck2 className="mx-auto size-8 text-[#3B82F6]" />
                  <p className="mt-3 font-extrabold">You’re all reconciled</p>
                  <p className="text-sm text-muted-foreground">
                    No uncertain matches are waiting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <Card className="surface-card rounded-[24px]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Spending pulse{" "}
              <ListFilter className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] px-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 20 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={95}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  formatter={(value) => formatMoney(Number(value) * 100)}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--primary)"
                  radius={[0, 8, 8, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function TaskRow({
  task,
  data,
  onReview,
}: {
  task: Reconciliation;
  data: DashboardData;
  onReview: () => void;
}) {
  const anchor = data.transactions.find(
    (item) =>
      item.id ===
      task.members.find((member) => member.role === "anchor")?.transactionId,
  );
  return (
    <article className="surface-card flex items-center gap-4 rounded-2xl p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(27,42,65,.1)]">
      <span
        className={`task-icon ${task.type === "reimbursement" ? "task-icon--coral" : "task-icon--blue"}`}
      >
        {task.type === "reimbursement" ? <CreditCard /> : <Landmark />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{task.title}</h3>
        <p className="truncate text-sm text-[#64748B] dark:text-[#94A3B8]">
          {task.explanation}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-bold">
          {anchor ? formatMoney(Math.abs(anchor.amountCents)) : ""}
        </p>
        <p className="text-xs font-semibold text-[#2563EB]">
          {task.confidence}% match
        </p>
      </div>
      <Button
        onClick={onReview}
        className="rounded-xl bg-[#1B2A41] px-4 text-white hover:bg-[#0A0F1E]"
      >
        Review
      </Button>
    </article>
  );
}

function TransactionsView({
  transactions,
  data,
  query,
  setQuery,
  onCategoryChange,
}: {
  transactions: Transaction[];
  data: DashboardData;
  query: string;
  setQuery: (query: string) => void;
  onCategoryChange: (transactionId: string, categoryId: string) => void;
}) {
  return (
    <Card className="surface-card rounded-3xl">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Transaction ledger</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Changing a category remembers that merchant for future imports.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search merchant or description"
              className="w-full pl-9 sm:w-72"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const account = data.accounts.find(
                  (item) => item.id === transaction.accountId,
                );
                return (
                  <TableRow
                    key={transaction.id}
                    className={transaction.excluded ? "opacity-45" : ""}
                  >
                    <TableCell className="whitespace-nowrap">
                      {new Date(
                        `${transaction.occurredOn}T12:00:00`,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <p className="font-bold">{transaction.merchant}</p>
                      <p className="max-w-72 truncate text-xs text-muted-foreground">
                        {transaction.descriptionRaw}
                      </p>
                    </TableCell>
                    <TableCell>{account?.name}</TableCell>
                    <TableCell>
                      <select
                        aria-label={`Category for ${transaction.merchant}`}
                        value={transaction.categoryId}
                        onChange={(event) =>
                          onCategoryChange(transaction.id, event.target.value)
                        }
                        className="field-control rounded-lg border px-2 py-1.5 text-sm outline-none"
                      >
                        {data.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {transaction.source}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-extrabold ${transaction.amountCents > 0 ? "text-[#2563EB]" : ""}`}
                    >
                      {formatMoney(transaction.amountCents, { sign: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!transactions.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-40 text-center text-muted-foreground"
                  >
                    No transactions match this month and search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsView({
  summary,
  chartData,
  cashView,
  setCashView,
  monthLabel,
}: {
  summary: ReturnType<typeof computeMonthlySummary>;
  chartData: Array<{ name: string; amount: number }>;
  cashView: boolean;
  setCashView: (value: boolean) => void;
  monthLabel: string;
}) {
  const values = cashView
    ? [
        {
          label: "Gross inflow",
          value: summary.grossInflowCents,
          icon: ArrowDownLeft,
        },
        {
          label: "Gross outflow",
          value: summary.grossOutflowCents,
          icon: ArrowUpRight,
        },
        {
          label: "Net cash movement",
          value: summary.grossInflowCents - summary.grossOutflowCents,
          icon: CircleDollarSign,
        },
      ]
    : [
        { label: "Income", value: summary.incomeCents, icon: ArrowDownLeft },
        {
          label: "True spend",
          value: summary.trueSpendCents,
          icon: ArrowUpRight,
        },
        {
          label: "Leftover",
          value: summary.leftoverCents,
          icon: CircleDollarSign,
        },
      ];
  return (
    <>
      <div className="surface-card mb-5 flex items-center justify-between rounded-2xl p-2">
        <div className="px-3">
          <p className="font-extrabold">{monthLabel}</p>
          <p className="text-xs text-muted-foreground">
            {cashView ? "Every real movement" : "Reimbursement adjusted"}
          </p>
        </div>
        <div className="flex rounded-xl bg-[#E2E8F0]/70 p-1 dark:bg-[#0A0F1E]">
          <button
            onClick={() => setCashView(false)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${!cashView ? "bg-white text-[#0A0F1E] shadow-sm dark:bg-[#1B2A41] dark:text-[#E2E8F0]" : "text-muted-foreground"}`}
          >
            True spending
          </button>
          <button
            onClick={() => setCashView(true)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${cashView ? "bg-white text-[#0A0F1E] shadow-sm dark:bg-[#1B2A41] dark:text-[#E2E8F0]" : "text-muted-foreground"}`}
          >
            Cash movement
          </button>
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        {values.map((item, index) => (
          <Card key={item.label} className="surface-card rounded-3xl">
            <CardContent className="p-6">
              <span
                className={`grid size-10 place-items-center rounded-2xl ${index === 2 ? "bg-[#0A0F1E] text-white" : "bg-[#E8F1FF] text-[#3B82F6] dark:bg-[#1B2A41] dark:text-[#93C5FD]"}`}
              >
                <item.icon className="size-5" />
              </span>
              <p className="mt-5 text-sm font-semibold text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">
                {formatMoney(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Card className="surface-card rounded-3xl">
          <CardHeader>
            <CardTitle>Where your true spend went</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  formatter={(value) => formatMoney(Number(value) * 100)}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--primary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-[#0A0F1E] text-white shadow-[0_24px_60px_rgba(10,15,30,.16)] ring-0">
          <CardContent className="p-7">
            <p className="text-sm font-semibold text-white/55">
              Report confidence
            </p>
            <p className="mt-2 text-4xl font-extrabold">
              {summary.completionPercent}%
            </p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {summary.totalTasks - summary.resolvedTasks} suggested
              relationship
              {summary.totalTasks - summary.resolvedTasks === 1 ? "" : "s"}{" "}
              still need your decision before this month is final.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#3B82F6]"
                style={{ width: `${summary.completionPercent}%` }}
              />
            </div>
            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-xs uppercase tracking-[.12em] text-white/45">
                Repayments applied
              </p>
              <p className="mt-1 text-xl font-bold">
                {formatMoney(summary.reimbursementCents)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
