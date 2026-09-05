import { CircleDollarSign, LockKeyhole, Sparkles } from "lucide-react";
import { signIn, signUp } from "./actions";
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
          <span className="grid size-10 place-items-center rounded-xl bg-[#3B82F6] shadow-[0_10px_30px_rgba(59,130,246,.3)]">
            <CircleDollarSign />
          </span>
          <span className="text-2xl font-bold tracking-[-0.04em]">Divvy</span>
        </div>
        <div className="relative max-w-xl">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#93C5FD]">
            <Sparkles className="size-3.5" /> Clear money, confident decisions
          </span>
          <h1 className="text-5xl font-bold leading-[1.02] tracking-[-.055em] xl:text-6xl">
            Your money makes more sense when everything connects.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#94A3B8]">
            Match repayments, remove duplicate transfers, and see what you truly
            spent—without rebuilding a spreadsheet every month.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-xs text-[#94A3B8]">
          <span className="size-1.5 rounded-full bg-[#3B82F6]" />
          Private by design · Original records preserved
        </div>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <Card className="surface-card w-full max-w-md rounded-[28px]">
          <CardContent className="p-7 sm:p-10">
            <div className="mb-7 lg:hidden">
              <div className="flex items-center gap-2 text-xl font-extrabold">
                <span className="grid size-9 place-items-center rounded-xl bg-[#3B82F6] text-white">
                  <CircleDollarSign className="size-5" />
                </span>
                Divvy
              </div>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-[#E8F1FF] text-[#3B82F6]">
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
