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
    <main className="grid min-h-screen bg-[#f6f7fb] lg:grid-cols-[1fr_.85fr]">
      <section className="hidden bg-[#17231c] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10">
            <CircleDollarSign className="text-[#c8ff68]" />
          </span>
          <span className="text-2xl font-extrabold">TrueSpend</span>
        </div>
        <div className="max-w-xl">
          <Sparkles className="mb-5 size-8 text-[#c8ff68]" />
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-[-.05em]">
            Your money makes more sense when everything connects.
          </h1>
          <p className="mt-6 text-lg leading-8 text-white/60">
            Match repayments, remove duplicate transfers, and see what you truly
            spent—without rebuilding a spreadsheet every month.
          </p>
        </div>
        <p className="text-xs text-white/35">
          Private by design · Original records preserved
        </p>
      </section>
      <section className="flex items-center justify-center p-5">
        <Card className="w-full max-w-md rounded-[28px] border-0 bg-white shadow-xl ring-1 ring-black/5">
          <CardContent className="p-7 sm:p-9">
            <div className="mb-7 lg:hidden">
              <div className="flex items-center gap-2 text-xl font-extrabold">
                <CircleDollarSign className="text-[#7657ff]" />
                TrueSpend
              </div>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f0edff] text-[#6748ef]">
              <LockKeyhole />
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight">
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
                className="h-11 w-full bg-[#7657ff] text-white"
                type="submit"
              >
                {signup ? "Submit request" : "Sign in"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {signup ? "Already approved?" : "New to TrueSpend?"}{" "}
              <a
                className="font-bold text-[#6748ef]"
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
