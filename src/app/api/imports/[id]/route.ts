import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: batch } = await supabase
    .from("import_batches")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!batch)
    return Response.json({ error: "Import not found." }, { status: 404 });
  const { error: storageError } = await supabase.storage
    .from("statements")
    .remove([batch.storage_path]);
  if (storageError)
    return Response.json({ error: storageError.message }, { status: 400 });
  const { error } = await supabase
    .from("import_batches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (!error)
    await supabase.from("audit_events").insert({
      user_id: user.id,
      action: "import.deleted",
      entity_type: "import_batch",
      entity_id: id,
      details: {},
    });
  return error
    ? Response.json({ error: error.message }, { status: 400 })
    : Response.json({ ok: true });
}
