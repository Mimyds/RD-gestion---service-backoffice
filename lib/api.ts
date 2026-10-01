import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function authenticated() {
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  return { db, user: error ? null : data?.claims?.sub ?? null };
}
