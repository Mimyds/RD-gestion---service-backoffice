import { NextResponse } from "next/server";
import { authenticated, fail, rateLimited, readJsonBody } from "@/lib/api";
import { type CompanySettings, SETTINGS_LIMITS } from "@/lib/company";
import { loadSettings, settingsToRow } from "@/lib/settings";

export const dynamic = "force-dynamic";

const required: (keyof CompanySettings)[] = ["name", "address"];

function parse(input: unknown): CompanySettings | string {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Données invalides.";
  const values = {} as CompanySettings;
  for (const key of Object.keys(SETTINGS_LIMITS) as (keyof CompanySettings)[]) {
    const value = (input as Record<string, unknown>)[key];
    values[key] = typeof value === "string" ? value.trim() : "";
    if (values[key].length > SETTINGS_LIMITS[key]) return "Un des champs dépasse la longueur autorisée.";
  }
  if (required.some((key) => !values[key])) return "La raison sociale et l’adresse sont requises.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return "L’adresse e-mail n’est pas valide.";
  return values;
}

export async function GET() {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "settings:read", 120); if (limited) return limited;
  const { settings, error } = await loadSettings(db, user);
  if (error) return fail("Impossible de charger les réglages.", 503);
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "settings:write", 30); if (limited) return limited;
  const body = await readJsonBody(request, 32_000); if (body.response) return body.response;
  const input = body.data;
  const settings = parse(input);
  if (typeof settings === "string") return fail(settings, 400);
  const current = await loadSettings(db, user);
  if (current.error) return fail("Impossible de charger les réglages.", 503);
  const { error } = await db.from("users").upsert({ id: user, ...settingsToRow(settings, current.row) });
  if (error) return fail("Enregistrement des réglages impossible.", 409);
  return NextResponse.json({ settings });
}
