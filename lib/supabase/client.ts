import { createBrowserClient } from "@supabase/ssr";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);

// A local Supabase (127.0.0.1) is unreachable from a phone on the LAN: point the browser at the host serving the page instead.
function browserUrl() {
  const url = new URL(configuredUrl);
  if (typeof window !== "undefined" && loopback.has(url.hostname) && !loopback.has(window.location.hostname)) url.hostname = window.location.hostname;
  return url.origin;
}

// Keep the cookie name derived from the configured URL so the server, which still uses 127.0.0.1, finds the session.
const cookieName = `sb-${new URL(configuredUrl).hostname.split(".")[0]}-auth-token`;

export function createClient() {
  return createBrowserClient(browserUrl(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookieOptions: { name: cookieName } });
}
