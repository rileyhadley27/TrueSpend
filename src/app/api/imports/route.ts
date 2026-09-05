import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestions } from "@/lib/finance/matching";

const candidateSchema = z.object({
  rowNumber: z.number().int().positive(),
  date: z.iso.date(),
  description: z.string().trim().min(1).max(500),
  amountCents: z
    .number()
    .int()
    .refine((value) => value !== 0),
  confidence: z.number().min(0).max(100),
  raw: z.record(z.string(), z.string()),
  errors: z.array(z.string()),
});

function duplicateImportResponse(
  fileName: string,
  committedAt?: string | null,
) {
  const importedOn = committedAt
    ? ` on ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(committedAt))}`
    : "";

  return Response.json(
    {
      code: "statement_already_imported",
      error: `“${fileName}” was already imported${importedOn}. No duplicate transactions were added.`,
    },
    { status: 409 },
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to import statements." },
      { status: 401 },
    );
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("user_id", user.id)
    .single();
  if (profile?.status !== "active")
    return Response.json(
      { error: "Your account is not approved." },
      { status: 403 },
    );
  const form = await request.formData();
  const file = form.get("file");
  const accountId = String(form.get("accountId") ?? "");
  const fileHash = String(form.get("fileHash") ?? "");
  const fileName = String(form.get("fileName") ?? "statement");
  if (!(file instanceof File) || file.size > 20 * 1024 * 1024)
    return Response.json(
      { error: "Choose a statement no larger than 20 MB." },
      { status: 400 },
    );
  if (!/^[a-f0-9]{64}$/.test(fileHash))
    return Response.json(
      {
        error: "The statement fingerprint was invalid. Choose the file again.",
      },
      { status: 400 },
    );
  if (
    !fileName.toLowerCase().endsWith(".csv") &&
    !fileName.toLowerCase().endsWith(".pdf")
  )
    return Response.json(
      { error: "Only CSV and PDF statements are supported." },
      { status: 400 },
    );
  let candidates: z.infer<typeof candidateSchema>[];
  try {
    candidates = z
      .array(candidateSchema)
      .min(1)
      .max(5000)
      .parse(JSON.parse(String(form.get("candidates") ?? "[]")));
  } catch {
    return Response.json(
      { error: "The reviewed transaction rows were invalid." },
      { status: 400 },
    );
  }
  const { data: existingImport, error: duplicateLookupError } = await supabase
    .from("import_batches")
    .select("file_name,committed_at")
    .eq("user_id", user.id)
    .eq("file_hash", fileHash)
    .maybeSingle();
  if (duplicateLookupError)
    return Response.json(
      { error: "Divvy could not check this statement. Please try again." },
      { status: 500 },
    );
  if (existingImport)
    return duplicateImportResponse(
      existingImport.file_name,
      existingImport.committed_at,
    );

  const importId = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${importId}/${safeName}`;
  const contentType = fileName.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "text/csv";
  const { error: uploadError } = await supabase.storage
    .from("statements")
    .upload(storagePath, file, { contentType, upsert: false });
  if (uploadError)
    return Response.json({ error: uploadError.message }, { status: 400 });
  const { data, error } = await supabase.rpc("commit_statement_import", {
    p_import_id: importId,
    p_account_id: accountId,
    p_file_name: fileName,
    p_storage_path: storagePath,
    p_file_hash: fileHash,
    p_content_type: contentType,
    p_file_size: file.size,
    p_candidates: candidates,
  });
  if (error) {
    await supabase.storage.from("statements").remove([storagePath]);
    if (error.code === "23505") return duplicateImportResponse(fileName);
    return Response.json({ error: error.message }, { status: 400 });
  }
  const mappingValue = form.get("mapping");
  const headerSignature = String(form.get("headerSignature") ?? "");
  if (mappingValue && headerSignature) {
    let parsedMapping: unknown;
    try {
      parsedMapping = JSON.parse(String(mappingValue));
    } catch {
      parsedMapping = null;
    }
    const mapping = z
      .object({
        date: z.string(),
        description: z.string(),
        amount: z.string().optional(),
        debit: z.string().optional(),
        credit: z.string().optional(),
      })
      .safeParse(parsedMapping);
    const { data: account } = await supabase
      .from("financial_accounts")
      .select("institution")
      .eq("id", accountId)
      .single();
    if (mapping.success && account)
      await supabase.from("import_presets").upsert(
        {
          user_id: user.id,
          name: `${accountId}:${headerSignature}`,
          institution: account.institution,
          mapping: mapping.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,name" },
      );
  }
  const [
    { data: accountRows },
    { data: transactionRows },
    { data: memberRows },
  ] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("id,name,institution,kind,last4,color"),
    supabase
      .from("transactions")
      .select(
        "id,account_id,occurred_on,posted_on,description_raw,merchant_normalized,amount_cents,category_id,source,excluded,note,source_external_id,source_fingerprint",
      ),
    supabase
      .from("reconciliation_members")
      .select("reconciliation_id,transaction_id"),
  ]);
  const existingByLink = new Map<string, string[]>();
  (memberRows ?? []).forEach((row) =>
    existingByLink.set(row.reconciliation_id, [
      ...(existingByLink.get(row.reconciliation_id) ?? []),
      row.transaction_id,
    ]),
  );
  const existingPairs = new Set(
    [...existingByLink.values()].map((ids) => ids.sort().join(":")),
  );
  const suggestions = generateSuggestions(
    (transactionRows ?? []).map((row) => ({
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
    (accountRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      institution: row.institution,
      kind: row.kind,
      last4: row.last4 ?? undefined,
      color: row.color,
    })),
  ).filter(
    (suggestion) =>
      !existingPairs.has(
        suggestion.members
          .map((member) => member.transactionId)
          .sort()
          .join(":"),
      ),
  );
  for (const suggestion of suggestions.slice(0, 100)) {
    const { data: reconciliation } = await supabase
      .from("reconciliations")
      .insert({
        user_id: user.id,
        type: suggestion.type,
        status: "suggested",
        confidence: suggestion.confidence,
        title: suggestion.title,
        explanation: suggestion.explanation,
      })
      .select("id")
      .single();
    if (reconciliation)
      await supabase.from("reconciliation_members").insert(
        suggestion.members.map((member) => ({
          user_id: user.id,
          reconciliation_id: reconciliation.id,
          transaction_id: member.transactionId,
          role: member.role,
          allocation_cents: member.allocationCents,
        })),
      );
  }
  return Response.json({ importId: data }, { status: 201 });
}
