import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  categoryId: z.uuid(),
  rememberMerchant: z.boolean().default(true),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json({ error: "Invalid category." }, { status: 400 });
  const { data: transaction, error: readError } = await supabase
    .from("transactions")
    .select("merchant_normalized,category_id")
    .eq("id", id)
    .single();
  if (readError || !transaction)
    return Response.json({ error: "Transaction not found." }, { status: 404 });
  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: parsed.data.categoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (
    parsed.data.rememberMerchant &&
    transaction.merchant_normalized.trim().length >= 2
  ) {
    await supabase.from("merchant_rules").upsert(
      {
        user_id: user.id,
        match_text: transaction.merchant_normalized.trim().slice(0, 200),
        normalized_merchant: transaction.merchant_normalized,
        category_id: parsed.data.categoryId,
      },
      { onConflict: "user_id,match_text" },
    );
  }
  await supabase.from("audit_events").insert({
    user_id: user.id,
    action: "transaction.category_changed",
    entity_type: "transaction",
    entity_id: id,
    details: {
      from: transaction.category_id,
      to: parsed.data.categoryId,
      merchant_rule_saved: parsed.data.rememberMerchant,
    },
  });
  return Response.json({ ok: true });
}
