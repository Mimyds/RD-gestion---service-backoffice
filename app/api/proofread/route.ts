import { NextResponse } from "next/server";
import { authenticated, fail, rateLimited, readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "proofread", 10); if (limited) return limited;
  const requestBody = await readJsonBody<{ text?: unknown }>(request, 25_000); if (requestBody.response) return requestBody.response;
  const input = requestBody.data!;

  const content = typeof input.text === "string" ? input.text : "";
  if (!content.trim()) return fail("Le courrier est vide.", 400);
  if (content.length > 20_000) return fail("Le courrier dépasse la limite de 20 000 caractères.", 413);

  const endpoint = process.env.LANGUAGETOOL_API_URL || "https://api.languagetool.org/v2/check";
  const body = new URLSearchParams({ text: content, language: "fr", level: "picky" });
  if (process.env.LANGUAGETOOL_USERNAME) body.set("username", process.env.LANGUAGETOOL_USERNAME);
  if (process.env.LANGUAGETOOL_API_KEY) body.set("apiKey", process.env.LANGUAGETOOL_API_KEY);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return fail("Le service de correction est momentanément indisponible.", 502);

    const result = await response.json() as {
      matches?: Array<{
        message?: string;
        shortMessage?: string;
        offset?: number;
        length?: number;
        replacements?: Array<{ value?: string }>;
        rule?: { id?: string; category?: { name?: string } };
      }>;
    };

    return NextResponse.json({
      matches: (result.matches || []).slice(0, 100).flatMap((match) => {
        if (!Number.isInteger(match.offset) || !Number.isInteger(match.length) || !match.length) return [];
        return [{
          message: match.message || match.shortMessage || "Correction suggérée",
          offset: match.offset,
          length: match.length,
          replacements: (match.replacements || []).slice(0, 5).flatMap((item) => typeof item.value === "string" ? [item.value] : []),
          ruleId: match.rule?.id || "",
          category: match.rule?.category?.name || "Langue",
        }];
      }),
    });
  } catch {
    return fail("Le service de correction ne répond pas. Réessayez dans un instant.", 504);
  }
}
