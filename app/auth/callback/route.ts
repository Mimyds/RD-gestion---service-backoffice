import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectUrl } from "@/lib/security/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = safeRedirectUrl(url.searchParams.get("next"), url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
