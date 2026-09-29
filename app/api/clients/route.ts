import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const selection = "id,type,company_name,first_name,last_name,email,phone,address_line1,address_line2,postal_code,city,country,siret,vat_number,notes";

async function context() {
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  return { db, user: error ? null : data?.claims?.sub };
}

export async function GET() {
  const { db, user } = await context();
  if (!user) return fail("Connexion requise.", 401);
  const { data, error } = await db
    .from("clients")
    .select(selection)
    .eq("user_id", user)
    .order("company_name", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true, nullsFirst: false });
  if (error) return fail("Impossible de charger les clients.", 503);
  return NextResponse.json({ clients: data || [] });
}

export async function POST(request: Request) {
  const { db, user } = await context();
  if (!user) return fail("Connexion requise.", 401);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return fail("Données invalides.", 400); }
  const type = input.type === "particulier" ? "particulier" : "entreprise";
  const companyName = typeof input.companyName === "string" ? input.companyName.trim() : "";
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  if ((type === "entreprise" && !companyName) || (type === "particulier" && !firstName && !lastName)) return fail("Le nom du client est requis.", 400);
  const value = (key: string) => typeof input[key] === "string" ? input[key].trim() || null : null;
  const { data, error } = await db.from("clients").insert({
    user_id: user,
    type,
    company_name: type === "entreprise" ? companyName : null,
    first_name: type === "particulier" ? firstName || null : null,
    last_name: type === "particulier" ? lastName || null : null,
    email: value("email"),
    phone: value("phone"),
    address_line1: value("addressLine1"),
    address_line2: value("addressLine2"),
    postal_code: value("postalCode"),
    city: value("city"),
    country: value("country") || "France",
    siret: value("siret"),
    vat_number: value("vatNumber"),
    notes: value("notes")
  }).select(selection).single();
  if (error) return fail("Impossible d’enregistrer le client.", 409);
  return NextResponse.json({ client: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const { db, user } = await context();
  if (!user) return fail("Connexion requise.", 401);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return fail("Données invalides.", 400); }
  const id = typeof input.id === "string" ? input.id : "";
  if (!id) return fail("Client introuvable.", 400);
  const type = input.type === "particulier" ? "particulier" : "entreprise";
  const companyName = typeof input.companyName === "string" ? input.companyName.trim() : "";
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  if ((type === "entreprise" && !companyName) || (type === "particulier" && !firstName && !lastName)) return fail("Le nom du client est requis.", 400);
  const value = (key: string) => typeof input[key] === "string" ? input[key].trim() || null : null;
  const { data, error } = await db.from("clients").update({
    type,
    company_name: type === "entreprise" ? companyName : null,
    first_name: type === "particulier" ? firstName || null : null,
    last_name: type === "particulier" ? lastName || null : null,
    email: value("email"),
    phone: value("phone"),
    address_line1: value("addressLine1"),
    address_line2: value("addressLine2"),
    postal_code: value("postalCode"),
    city: value("city"),
    country: value("country") || "France",
    siret: value("siret"),
    vat_number: value("vatNumber"),
    notes: value("notes")
  }).eq("id", id).eq("user_id", user).select(selection).single();
  if (error) return fail("Impossible de modifier le client.", 409);
  return NextResponse.json({ client: data });
}

export async function DELETE(request: Request) {
  const { db, user } = await context();
  if (!user) return fail("Connexion requise.", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Client introuvable.", 400);
  const { error } = await db.from("clients").delete().eq("id", id).eq("user_id", user);
  if (error) return fail("Impossible de supprimer le client.", 409);
  return NextResponse.json({ deleted: true });
}
