"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "admin")
    throw new Error("Administrator access required.");
  return user;
}

export async function decideSignup(formData: FormData) {
  const actor = await requireAdmin();
  const parsed = z
    .object({ userId: z.uuid(), decision: z.enum(["active", "rejected"]) })
    .parse({
      userId: formData.get("userId"),
      decision: formData.get("decision"),
    });
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      status: parsed.decision,
      approved_at:
        parsed.decision === "active" ? new Date().toISOString() : null,
      approved_by: actor.id,
    })
    .eq("user_id", parsed.userId);
  if (error) throw new Error(error.message);
  await admin.auth.admin.updateUserById(parsed.userId, {
    app_metadata: { role: "user", profile_status: parsed.decision },
  });
  await admin.from("audit_events").insert({
    user_id: actor.id,
    action: `profile.${parsed.decision}`,
    entity_type: "profile",
    entity_id: parsed.userId,
    details: { subject_user_id: parsed.userId },
  });
  revalidatePath("/admin");
}
