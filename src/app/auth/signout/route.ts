import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const destination = new URL("/auth", request.url);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(destination, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    destination.searchParams.set(
      "error",
      "We could not end your session. Please try again.",
    );
  }

  return NextResponse.redirect(destination, 303);
}
