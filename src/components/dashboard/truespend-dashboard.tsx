"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
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

import { ImportDialog } from "./import-dialog";
import { AccountDialog } from "./account-dialog";
import { ManualDialog } from "./manual-dialog";
import { ReviewDialog } from "./review-dialog";
import { CategoryDialog } from "./category-dialog";
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

export function TrueSpendDashboard({
  initialData,
  demoMode = false,
  userName = "Riley",
}: {
  initialData: DashboardData;
  demoMode?: boolean;
  userName?: string;
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
    <div className="min-h-screen bg-[#f6f7fb] text-[#17211b]">
      <Header
        view={view}
        setView={setView}
        userName={userName}
        demoMode={demoMode}
      />
      <main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8 lg:py-9">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#67806f]">
              <Sparkles className="size-4 text-[#7257ff]" /> Your money,
              reconciled
            </div>
            <h1 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
              {view === "overview"
                ? `Good morning, ${userName}.`
                : view === "transactions"
                  ? "Every dollar, in one place."
                  : "Your true monthly picture."}
            </h1>
            <p className="mt-2 text-[#69736d]">
              {view === "overview"
                ? `${monthLabel} has ${tasks.length} item${tasks.length === 1 ? "" : "s"} ready for review.`
                : view === "transactions"
                  ? "Search the ledger without losing the original statement facts."
                  : "Switch between adjusted spending and real cash movement."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold">
              <CalendarDays className="size-4" />
              <input
                aria-label="Reporting month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
            <Button
              variant="outline"
              onClick={() => setCategoryOpen(true)}
              className="h-10 rounded-xl bg-white px-4"
            >
              Add category
            </Button>
            <Button
              variant="outline"
              onClick={() => setAccountOpen(true)}
              className="h-10 rounded-xl bg-white px-4"
            >
              <Landmark /> Add account
            </Button>
            <Button
              variant="outline"
              onClick={() => setManualOpen(true)}
              disabled={!data.accounts.length}
              className="h-10 rounded-xl bg-white px-4"
            >
              <Plus /> Add transaction
            </Button>
            <Button
              onClick={() => setImportOpen(true)}
              disabled={!data.accounts.length}
              className="h-10 rounded-xl bg-[#7657ff] px-4 text-white hover:bg-[#6446ef]"
            >
              <Upload /> Import statement
            </Button>
          </div>
        </div>

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
  demoMode,
}: {
  view: View;
  setView: (view: View) => void;
  userName: string;
  demoMode: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-8">
        <button
          onClick={() => setView("overview")}
          className="flex items-center gap-3"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-[#18231c] text-white">
            <CircleDollarSign className="size-5 text-[#c8ff68]" />
          </span>
          <span className="text-xl font-extrabold tracking-[-0.04em]">
            TrueSpend
          </span>
          {demoMode && <Badge variant="secondary">Demo</Badge>}
        </button>
        <nav
          className="hidden items-center gap-1 rounded-xl bg-[#f3f5f3] p-1 md:flex"
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${view === item.id ? "bg-white text-[#17211b] shadow-sm" : "text-[#667069]"}`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell />
          </Button>
          <button className="flex items-center gap-2 rounded-xl border border-black/7 bg-white px-2 py-1.5 text-sm font-semibold shadow-sm">
            <span className="grid size-7 place-items-center rounded-lg bg-[#ffd8bd] text-xs font-bold">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden sm:inline">{userName}</span>
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>
      <nav
        className="flex border-t bg-white px-3 md:hidden"
        aria-label="Mobile navigation"
      >
        {(["overview", "transactions", "reports"] as View[]).map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`flex-1 py-2 text-xs font-bold capitalize ${view === item ? "text-[#6748ef]" : "text-[#7c8580]"}`}
          >
            {item}
          </button>
        ))}
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
      <section className="grid gap-4 lg:grid-cols-[1.55fr_0.8fr]">
        <Card className="rounded-[28px] border-0 bg-[#17231c] py-0 text-white shadow-[0_20px_50px_rgba(23,35,28,.14)] ring-0">
          <CardContent className="grid min-h-[325px] gap-8 p-7 md:grid-cols-[1fr_230px] md:p-9">
            <div className="flex flex-col justify-between">
              <div>
                <Badge className="border-0 bg-white/10 px-3 py-1.5 text-[#dcfbc1]">
                  {monthLabel.toUpperCase()}
                </Badge>
                <p className="mt-7 text-sm font-medium text-white/55">
                  You have left over
                </p>
                <p className="mt-1 text-5xl font-extrabold tracking-[-0.06em] sm:text-6xl">
                  {formatMoney(summary.leftoverCents)}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
                  <span className="rounded-full bg-[#bff55a]/15 px-2.5 py-1 font-bold text-[#c8ff68]">
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
                  background: `conic-gradient(#c8ff68 0 ${summary.completionPercent}%, rgba(255,255,255,.12) ${summary.completionPercent}% 100%)`,
                }}
              >
                <div className="grid size-[142px] place-items-center rounded-full bg-[#17231c] text-center">
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
                  <span className="absolute -right-1 top-7 grid size-9 place-items-center rounded-full bg-[#c8ff68] text-[#17231c]">
                    <Check className="size-5 stroke-[3]" />
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-0 bg-[#eff3ff] py-0 shadow-sm ring-0">
          <CardContent className="flex h-full flex-col p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#58655c]">
                  True spend insight
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  Repayments found
                </h2>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-[#7657ff] text-white">
                <WalletCards />
              </span>
            </div>
            <div className="mt-7 rounded-2xl bg-white/80 p-5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Statement spending</span>
                <span className="font-bold">
                  {formatMoney(
                    summary.trueSpendCents + summary.reimbursementCents,
                  )}
                </span>
              </div>
              <div className="my-4 h-px bg-black/7" />
              <div className="flex justify-between text-sm text-[#39835b]">
                <span>Confirmed repayments</span>
                <span className="font-bold">
                  −{formatMoney(summary.reimbursementCents)}
                </span>
              </div>
            </div>
            <div className="mt-auto flex items-end justify-between pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#6d7781]">
                  True spend
                </p>
                <p className="mt-1 text-3xl font-extrabold">
                  {formatMoney(summary.trueSpendCents)}
                </p>
              </div>
              <Badge variant="outline" className="bg-white">
                Auditable
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-extrabold">Reconciliation inbox</h2>
              <p className="mt-1 text-sm text-[#748079]">
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
              <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed bg-white text-center">
                <div>
                  <FileCheck2 className="mx-auto size-8 text-[#31a873]" />
                  <p className="mt-3 font-extrabold">You’re all reconciled</p>
                  <p className="text-sm text-muted-foreground">
                    No uncertain matches are waiting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <Card className="rounded-[24px] border-0 bg-white shadow-sm ring-1 ring-black/5">
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
                <CartesianGrid horizontal={false} stroke="#eef0ef" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={95}
                  tick={{ fontSize: 11, fill: "#667069" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  formatter={(value) => formatMoney(Number(value) * 100)}
                  cursor={{ fill: "#f5f3ff" }}
                />
                <Bar
                  dataKey="amount"
                  fill="#7657ff"
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
    <article className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_7px_24px_rgba(26,34,29,.04)]">
      <span
        className={`task-icon ${task.type === "reimbursement" ? "task-icon--coral" : "task-icon--blue"}`}
      >
        {task.type === "reimbursement" ? <CreditCard /> : <Landmark />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{task.title}</h3>
        <p className="truncate text-sm text-[#778079]">{task.explanation}</p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-bold">
          {anchor ? formatMoney(Math.abs(anchor.amountCents)) : ""}
        </p>
        <p className="text-xs font-semibold text-[#7d6df0]">
          {task.confidence}% match
        </p>
      </div>
      <Button
        onClick={onReview}
        className="rounded-xl bg-[#18231c] px-4 text-white"
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
    <Card className="rounded-3xl border-0 bg-white shadow-sm ring-1 ring-black/5">
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
                        className="rounded-lg border bg-white px-2 py-1.5 text-sm"
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
                      className={`text-right font-extrabold ${transaction.amountCents > 0 ? "text-[#278456]" : ""}`}
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
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
        <div className="px-3">
          <p className="font-extrabold">{monthLabel}</p>
          <p className="text-xs text-muted-foreground">
            {cashView ? "Every real movement" : "Reimbursement adjusted"}
          </p>
        </div>
        <div className="flex rounded-xl bg-[#f1f3f1] p-1">
          <button
            onClick={() => setCashView(false)}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${!cashView ? "bg-white shadow-sm" : "text-muted-foreground"}`}
          >
            True spending
          </button>
          <button
            onClick={() => setCashView(true)}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${cashView ? "bg-white shadow-sm" : "text-muted-foreground"}`}
          >
            Cash movement
          </button>
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        {values.map((item, index) => (
          <Card
            key={item.label}
            className="rounded-3xl border-0 bg-white shadow-sm ring-1 ring-black/5"
          >
            <CardContent className="p-6">
              <span
                className={`grid size-10 place-items-center rounded-2xl ${index === 2 ? "bg-[#17231c] text-[#c8ff68]" : "bg-[#f0edff] text-[#6748ef]"}`}
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
        <Card className="rounded-3xl border-0 bg-white shadow-sm ring-1 ring-black/5">
          <CardHeader>
            <CardTitle>Where your true spend went</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#eef0ef" />
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
                <Bar dataKey="amount" fill="#7657ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-[#17231c] text-white shadow-sm ring-0">
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
                className="h-full rounded-full bg-[#c8ff68]"
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
