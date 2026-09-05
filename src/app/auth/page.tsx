import {
  CheckCircle2,
  Link2,
  LockKeyhole,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { signIn, signUp } from "./actions";
import { DivvyLogo } from "@/components/brand/divvy-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#0A0F1E] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -right-36 -top-36 size-[34rem] rounded-full bg-[#3B82F6]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -left-40 size-[32rem] rounded-full bg-[#1B2A41] blur-3xl" />
        <div className="relative flex items-center gap-3">
          <DivvyLogo className="size-11 shadow-[0_10px_30px_rgba(59,130,246,.3)] ring-1 ring-white/10" />
          <span className="text-2xl font-bold tracking-[-0.04em]">Divvy</span>
        </div>
        <div className="relative max-w-2xl">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#93C5FD]">
            <Sparkles className="size-3.5" /> Clear money, confident decisions
          </span>
          <h1 className="display-heading text-6xl leading-[.96] xl:text-7xl">
            Your money. <br />
            Your rules. <br />
            <span className="text-[#3B82F6]">One true picture.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#94A3B8]">
            Match repayments, remove duplicate transfers, and see what you truly
            spent—without rebuilding a spreadsheet every month.
          </p>
        </div>
        <div className="relative">
          <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <div className="col-span-3 flex items-center justify-between rounded-2xl bg-white/7 p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#3B82F6] text-white">
                  <CheckCircle2 className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Monthly view ready</p>
                  <p className="text-xs text-[#94A3B8]">
                    Every adjustment stays auditable
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#3B82F6]/15 px-2.5 py-1 text-xs font-semibold text-[#93C5FD]">
                Reconciled
              </span>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <ReceiptText className="size-4 text-[#60A5FA]" />
              <p className="mt-3 text-xs text-[#94A3B8]">Statements</p>
              <p className="mt-0.5 text-sm font-semibold">Preserved</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <Link2 className="size-4 text-[#60A5FA]" />
              <p className="mt-3 text-xs text-[#94A3B8]">Repayments</p>
              <p className="mt-0.5 text-sm font-semibold">Connected</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <Sparkles className="size-4 text-[#60A5FA]" />
              <p className="mt-3 text-xs text-[#94A3B8]">True view</p>
              <p className="mt-0.5 text-sm font-semibold">Clear</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 text-xs text-[#94A3B8]">
            <span className="size-1.5 rounded-full bg-[#3B82F6]" />
            Private by design · Original records preserved
          </div>
        </div>
      </section>
      <section className="relative flex items-center justify-center overflow-hidden p-5 sm:p-10">
        <div className="pointer-events-none absolute right-0 top-0 size-80 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <Card className="glass-panel relative w-full max-w-md rounded-[32px]">
          <CardContent className="p-7 sm:p-10">
            <div className="mb-7 lg:hidden">
              <div className="flex items-center gap-2 text-xl font-extrabold">
                <DivvyLogo className="size-9 shadow-sm" />
                Divvy
              </div>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-[#E8F1FF] text-[#3B82F6] dark:bg-[#1B2A41] dark:text-[#93C5FD]">
              <LockKeyhole />
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em]">
              {signup ? "Request access" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {signup
                ? "Verify your email, then an administrator will approve your account."
                : "Sign in to your private financial workspace."}
            </p>
            {params.error && (
              <Alert variant="destructive" className="mt-5">
                <AlertDescription>{params.error}</AlertDescription>
              </Alert>
            )}
            <form action={signup ? signUp : signIn} className="mt-6 space-y-4">
              {signup && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    autoComplete="name"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={10}
                  autoComplete={signup ? "new-password" : "current-password"}
                  required
                />
              </div>
              <Button
                className="h-11 w-full rounded-xl bg-[#3B82F6] text-white shadow-[0_10px_28px_rgba(59,130,246,.24)] hover:bg-[#2563EB]"
                type="submit"
              >
                {signup ? "Submit request" : "Sign in"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {signup ? "Already approved?" : "New to Divvy?"}{" "}
              <a
                className="font-bold text-[#2563EB] hover:text-[#1D4ED8]"
                href={signup ? "/auth" : "/auth?mode=signup"}
              >
                {signup ? "Sign in" : "Request access"}
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
