import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  accountId: z.uuid(),
  occurredOn: z.iso.date(),
  merchant: z.string().trim().min(1).max(200),
  amountCents: z
    .number()
    .int()
    .refine((value) => value !== 0),
  categoryId: z.uuid(),
  note: z.string().max(500).optional(),
});
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Check the transaction details." },
      { status: 400 },
    );
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: parsed.data.accountId,
      occurred_on: parsed.data.occurredOn,
      description_raw: parsed.data.merchant,
      merchant_normalized: parsed.data.merchant,
      amount_cents: parsed.data.amountCents,
      category_id: parsed.data.categoryId,
      source: "manual",
      note: parsed.data.note,
    })
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await supabase.from("audit_events").insert({
    user_id: user.id,
    action: "transaction.manual_created",
    entity_type: "transaction",
    entity_id: data.id,
    details: {},
  });
  return Response.json(data, { status: 201 });
}
