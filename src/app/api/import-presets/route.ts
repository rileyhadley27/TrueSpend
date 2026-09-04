import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const signature = url.searchParams.get("signature");
  if (!accountId || !signature)
    return Response.json({ error: "Missing preset key." }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase
    .from("import_presets")
    .select("mapping")
    .eq("user_id", user.id)
    .eq("name", `${accountId}:${signature}`)
    .maybeSingle();
  return Response.json(data ?? {});
}
