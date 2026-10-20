import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectUrl } from "@/lib/security/safe-redirect";

const supportedEmailOtpTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function errorCode(type: string | null) {
  if (type === "invite") return "invitation";
  if (type === "recovery") return "recovery";
  return "confirmation";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const type = requestedType && supportedEmailOtpTypes.has(requestedType as EmailOtpType)
    ? requestedType as EmailOtpType
    : null;
  const destination = safeRedirectUrl(url.searchParams.get("next"), url.origin);
  const supabase = await createClient();
  let authenticated = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authenticated = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authenticated = !error;
  }

  if (authenticated) {
    if (type === "invite") return NextResponse.redirect(new URL("/auth/reset-password?flow=invite", url.origin));
    if (type === "recovery") return NextResponse.redirect(new URL("/auth/reset-password", url.origin));
    return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(new URL(`/login?error=${errorCode(requestedType)}`, url.origin));
}
