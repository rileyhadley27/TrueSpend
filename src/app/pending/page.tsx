import { Clock3 } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { DivvyLogo } from "@/components/brand/divvy-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <Card className="surface-card max-w-lg rounded-[28px] text-center">
        <CardContent className="p-9 sm:p-11">
          <DivvyLogo className="mx-auto size-12 rounded-2xl shadow-[0_10px_30px_rgba(10,15,30,.2)]" />
          <span className="mx-auto mt-8 grid size-14 place-items-center rounded-full bg-[#E8F1FF] text-[#3B82F6] ring-8 ring-[#3B82F6]/5">
            <Clock3 />
          </span>
          <p className="eyebrow mt-7">Access pending</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
            Your request is in
          </h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Once your email is verified and an administrator approves access,
            your private Divvy workspace will be ready.
          </p>
          <form action={signOut} className="mt-7">
            <Button variant="outline" type="submit" className="rounded-xl">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
