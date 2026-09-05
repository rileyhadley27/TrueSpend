import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  X,
} from "lucide-react";
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
    <main className="min-h-screen px-3 pt-3 md:px-5">
      <header className="mx-auto max-w-6xl rounded-2xl bg-[#0A0F1E] text-white shadow-[0_18px_50px_rgba(10,15,30,.2)] ring-1 ring-white/8">
        <div className="flex h-16 items-center justify-between px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-[#3B82F6] shadow-[0_8px_20px_rgba(59,130,246,.3)]">
              <CircleDollarSign className="size-5" />
            </span>
            Divvy
          </Link>
          <Badge className="border-0 bg-[#3B82F6]/18 text-[#BFDBFE]">
            <ShieldCheck /> Administrator
          </Badge>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-2 py-10 sm:px-5 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#0A0F1E]"
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Workspace access</p>
            <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              Signup approvals
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Verified users cannot access financial data until you approve them
              here.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#E2E8F0]/70 px-4 py-3 ring-1 ring-[#94A3B8]/15">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-[#3B82F6] shadow-sm">
              <Clock3 className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#64748B]">
                Waiting
              </p>
              <p className="text-lg font-bold leading-5">
                {profiles?.length ?? 0} request
                {(profiles?.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <Card className="surface-card mt-8 rounded-3xl">
          <CardHeader className="border-b border-[#E2E8F0]">
            <CardTitle className="text-lg">Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profiles?.length ? (
              profiles.map((profile) => (
                <div
                  key={profile.user_id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#94A3B8]/50 sm:flex-row sm:items-center"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#1B2A41] font-bold text-white">
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
                      <Button
                        className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                        type="submit"
                      >
                        <Check /> Approve
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <ShieldCheck className="mx-auto size-8 text-[#3B82F6]" />
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
