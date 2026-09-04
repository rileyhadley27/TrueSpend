import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().min(1).max(100),
  kind: z.enum(["checking", "savings", "credit_card", "venmo", "cash"]),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
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
      { error: "Check the account details." },
      { status: 400 },
    );
  const { data, error } = await supabase
    .from("financial_accounts")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      institution: parsed.data.institution,
      kind: parsed.data.kind,
      last4: parsed.data.last4,
      color: parsed.data.color,
    })
    .select("id")
    .single();
  return error
    ? Response.json({ error: error.message }, { status: 400 })
    : Response.json(data, { status: 201 });
}
