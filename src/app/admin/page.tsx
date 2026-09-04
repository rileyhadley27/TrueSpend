import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, CircleDollarSign, ShieldCheck, X } from "lucide-react";
import { decideSignup } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "admin") redirect("/");
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id,email,display_name,status,created_at")
    .eq("status", "pending")
    .order("created_at");
  return (
    <main className="min-h-screen bg-[#f6f7fb]">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3 font-extrabold">
            <span className="grid size-9 place-items-center rounded-xl bg-[#17231c]">
              <CircleDollarSign className="size-5 text-[#c8ff68]" />
            </span>
            TrueSpend
          </Link>
          <Badge className="bg-[#eeeaff] text-[#5d43d2]">
            <ShieldCheck /> Administrator
          </Badge>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Signup approvals
        </h1>
        <p className="mt-2 text-muted-foreground">
          Verified users cannot access financial data until you approve them
          here.
        </p>
        <Card className="mt-7 rounded-3xl border-0 bg-white shadow-sm ring-1 ring-black/5">
          <CardHeader>
            <CardTitle>Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profiles?.length ? (
              profiles.map((profile) => (
                <div
                  key={profile.user_id}
                  className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#ffd8bd] font-extrabold">
                    {(profile.display_name ?? profile.email)
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {profile.display_name || "Unnamed user"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={decideSignup}>
                      <input
                        type="hidden"
                        name="userId"
                        value={profile.user_id}
                      />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button variant="outline" type="submit">
                        <X /> Reject
                      </Button>
                    </form>
                    <form action={decideSignup}>
                      <input
                        type="hidden"
                        name="userId"
                        value={profile.user_id}
                      />
                      <input type="hidden" name="decision" value="active" />
                      <Button className="bg-[#17231c] text-white" type="submit">
                        <Check /> Approve
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <ShieldCheck className="mx-auto size-8 text-[#31a873]" />
                  <p className="mt-3 font-extrabold">No requests waiting</p>
                  <p className="text-sm text-muted-foreground">
                    You’re caught up.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
