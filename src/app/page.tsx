import { redirect } from "next/navigation";
import { TrueSpendDashboard } from "@/components/dashboard/truespend-dashboard";
import { demoData } from "@/lib/data/demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!isSupabaseConfigured())
    return <TrueSpendDashboard initialData={demoData} demoMode />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, display_name")
    .eq("user_id", user.id)
    .single();
  if (!profile || profile.status !== "active") redirect("/pending");
  const [
    { data: accountRows },
    { data: categoryRows },
    { data: transactionRows },
    { data: reconciliationRows },
  ] = await Promise.all([
    supabase.from("financial_accounts").select("*"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false }),
    supabase
      .from("reconciliations")
      .select("*, reconciliation_members(*)")
      .order("created_at", { ascending: false }),
  ]);
  const data = {
    accounts: (accountRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      institution: row.institution,
      kind: row.kind,
      last4: row.last4 ?? undefined,
      color: row.color,
    })),
    categories: (categoryRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      isIncome: row.is_income,
    })),
    transactions: (transactionRows ?? []).map((row) => ({
      id: row.id,
      accountId: row.account_id,
      occurredOn: row.occurred_on,
      postedOn: row.posted_on ?? undefined,
      descriptionRaw: row.description_raw,
      merchant: row.merchant_normalized,
      amountCents: Number(row.amount_cents),
      categoryId: row.category_id,
      source: row.source,
      excluded: row.excluded,
      note: row.note ?? undefined,
      sourceExternalId: row.source_external_id ?? undefined,
      sourceFingerprint: row.source_fingerprint ?? undefined,
    })),
    reconciliations: (reconciliationRows ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      confidence: row.confidence,
      title: row.title,
      explanation: row.explanation,
      createdAt: row.created_at,
      members: (row.reconciliation_members ?? []).map(
        (member: Record<string, unknown>) => ({
          transactionId: member.transaction_id as string,
          role: member.role as "anchor" | "offset" | "duplicate",
          allocationCents: member.allocation_cents as number,
        }),
      ),
    })),
  };
  return (
    <TrueSpendDashboard
      initialData={data}
      userName={profile.display_name}
      isAdmin={user.app_metadata.role === "admin"}
    />
  );
}
