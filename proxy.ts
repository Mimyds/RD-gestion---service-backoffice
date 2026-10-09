import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateMutationRequest } from "@/lib/security/mutation-request";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function csp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  let supabaseOrigin = "";
  try {
    supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    // Missing or invalid configuration is handled before authentication.
  }
  const connectSources = isDev
    ? "'self' http: https: ws: wss:"
    : ["'self'", supabaseOrigin, supabaseOrigin.replace(/^https:/, "wss:")].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function secure(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = csp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    console.error(JSON.stringify({ event: "security.configuration_missing", path: request.nextUrl.pathname }));
    return secure(NextResponse.json({ error: "Service indisponible." }, { status: 503 }), policy);
  }

  if (request.nextUrl.pathname.startsWith("/api/") && mutationMethods.has(request.method)) {
    const failure = validateMutationRequest(request, request.nextUrl.origin);
    if (failure) {
      console.warn(JSON.stringify({ event: failure.event, method: request.method, path: request.nextUrl.pathname }));
      return secure(NextResponse.json({ error: failure.message }, { status: failure.status }), policy);
    }
  }

  let response = secure(NextResponse.next({ request: { headers: requestHeaders } }), policy);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items: {name: string; value: string; options: any}[], headers?: Record<string, string>) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = secure(NextResponse.next({ request: { headers: requestHeaders } }), policy);
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      }
    }
  });
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;
  if (!claims && pathname.startsWith("/api/")) {
    console.warn(JSON.stringify({ event: "security.authentication_required", method: request.method, path: pathname }));
    return secure(copyCookies(response, NextResponse.json({ error: "Connexion requise." }, { status: 401 })), policy);
  }
  if (!claims && pathname !== "/login" && !pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = "";
    return secure(copyCookies(response, NextResponse.redirect(url)), policy);
  }
  if (claims && pathname === "/login") { const url = request.nextUrl.clone(); url.pathname = "/factures"; return secure(NextResponse.redirect(url), policy); }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
