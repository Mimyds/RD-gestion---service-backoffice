import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitRow = { allowed: boolean; retry_after: number };

/** Uses an atomic, database-backed bucket shared by every application instance. */
export async function takeRateLimit(db: SupabaseClient, scope: string, limit: number, windowMs: number) {
  const { data, error } = await db.rpc("take_rate_limit", {
    p_scope: scope,
    p_limit: limit,
    p_window_ms: windowMs,
  });
  const row = Array.isArray(data) ? data[0] as RateLimitRow | undefined : data as RateLimitRow | null;

  if (error || !row || typeof row.allowed !== "boolean" || !Number.isFinite(row.retry_after)) {
    return { allowed: false, retryAfter: 1, unavailable: true };
  }

  return { allowed: row.allowed, retryAfter: Math.max(0, Math.ceil(row.retry_after)), unavailable: false };
}
