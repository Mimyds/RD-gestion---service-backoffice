import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { takeRateLimit } from "@/lib/rate-limit";

export const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function rateLimited(db: Awaited<ReturnType<typeof createClient>>, scope: string, limit = 60, windowMs = 60_000) {
  const result = await takeRateLimit(db, scope, limit, windowMs);
  if (result.unavailable) {
    console.error(JSON.stringify({ event: "security.rate_limit_unavailable", scope }));
    return fail("Service momentanément indisponible.", 503);
  }
  if (result.allowed) return null;
  console.warn(JSON.stringify({ event: "security.rate_limit_exceeded", scope }));
  return NextResponse.json(
    { error: "Trop de requêtes. Réessayez dans un instant." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}

export async function readJsonBody<T = unknown>(request: Request, maxBytes = 256_000) {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { response: fail("Requête trop volumineuse.", 413) };
  }

  if (!request.body) return { response: fail("Données invalides.", 400) };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        return { response: fail("Requête trop volumineuse.", 413) };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { data: JSON.parse(text) as T };
  } catch {
    return { response: fail("Données invalides.", 400) };
  } finally {
    reader.releaseLock();
  }
}

export async function authenticated() {
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  return { db, user: error ? null : data?.claims?.sub ?? null };
}
