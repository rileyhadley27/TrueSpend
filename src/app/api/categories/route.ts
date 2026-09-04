import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  isIncome: z.boolean().default(false),
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
      { error: "Check the category details." },
      { status: 400 },
    );
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color,
      is_income: parsed.data.isIncome,
      is_system: false,
    })
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await supabase.from("audit_events").insert({
    user_id: user.id,
    action: "category.created",
    entity_type: "category",
    entity_id: data.id,
    details: { name: parsed.data.name },
  });
  return Response.json(data, { status: 201 });
}
