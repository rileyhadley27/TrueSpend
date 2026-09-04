export type AccountKind =
  | "checking"
  | "savings"
  | "credit_card"
  | "venmo"
  | "cash";
export type ImportStatus =
  | "uploaded"
  | "extracting"
  | "needs_review"
  | "ready"
  | "committed"
  | "failed";
export type LinkType =
  | "duplicate"
  | "transfer"
  | "card_payment"
  | "reimbursement"
  | "refund";
export type LinkStatus = "suggested" | "confirmed" | "dismissed";
export type ProfileStatus = "pending" | "active" | "rejected";

export interface Account {
  id: string;
  name: string;
  institution: string;
  kind: AccountKind;
  last4?: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isIncome?: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  occurredOn: string;
  postedOn?: string;
  descriptionRaw: string;
  merchant: string;
  amountCents: number;
  categoryId: string;
  source: "import" | "manual";
  excluded?: boolean;
  note?: string;
  sourceExternalId?: string;
  sourceFingerprint?: string;
}

export interface ReconciliationMember {
  transactionId: string;
  role: "anchor" | "offset" | "duplicate";
  allocationCents: number;
}

export interface Reconciliation {
  id: string;
  type: LinkType;
  status: LinkStatus;
  confidence: number;
  title: string;
  explanation: string;
  members: ReconciliationMember[];
  createdAt: string;
}

export interface DashboardData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  reconciliations: Reconciliation[];
}

export interface MonthlySummary {
  month: string;
  incomeCents: number;
  trueSpendCents: number;
  leftoverCents: number;
  grossInflowCents: number;
  grossOutflowCents: number;
  reimbursementCents: number;
  resolvedTasks: number;
  totalTasks: number;
  completionPercent: number;
  categorySpend: Array<{ categoryId: string; amountCents: number }>;
}
