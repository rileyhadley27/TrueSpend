import { Clock3, CircleDollarSign } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] p-5">
      <Card className="max-w-lg rounded-[28px] border-0 bg-white text-center shadow-xl ring-1 ring-black/5">
        <CardContent className="p-9">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#17231c]">
            <CircleDollarSign className="text-[#c8ff68]" />
          </div>
          <span className="mx-auto mt-8 grid size-14 place-items-center rounded-full bg-[#fff3ce] text-[#a46b00]">
            <Clock3 />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
            Your request is in
          </h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Once your email is verified and an administrator approves access,
            your private TrueSpend workspace will be ready.
          </p>
          <form action={signOut} className="mt-7">
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
