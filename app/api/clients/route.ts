import { NextResponse } from "next/server";
import { authenticated, fail, isUuid } from "@/lib/api";

export const dynamic = "force-dynamic";

const selection = "id,type,company_name,first_name,last_name,email,phone,address_line1,address_line2,postal_code,city,country,siret,vat_number,notes";

function parse(input: Record<string, unknown>) {
  const type = input.type === "particulier" ? "particulier" : "entreprise";
  const value = (key: string) => typeof input[key] === "string" ? input[key].trim() || null : null;
  const companyName = value("companyName");
  const firstName = value("firstName");
  const lastName = value("lastName");
  if ((type === "entreprise" && !companyName) || (type === "particulier" && !firstName && !lastName)) return null;
  return {
    type,
    company_name: type === "entreprise" ? companyName : null,
    first_name: type === "particulier" ? firstName : null,
    last_name: type === "particulier" ? lastName : null,
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
  };
}

async function readInput(request: Request) {
  try {
    const input = await request.json();
    return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const { db, user } = await authenticated();
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
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const input = await readInput(request);
  if (!input) return fail("Données invalides.", 400);
  const values = parse(input);
  if (!values) return fail("Le nom du client est requis.", 400);
  const { data, error } = await db.from("clients").insert({ user_id: user, ...values }).select(selection).single();
  if (error) return fail("Impossible d’enregistrer le client.", 409);
  return NextResponse.json({ client: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const input = await readInput(request);
  if (!input) return fail("Données invalides.", 400);
  if (!isUuid(input.id)) return fail("Client introuvable.", 400);
  const values = parse(input);
  if (!values) return fail("Le nom du client est requis.", 400);
  const { data, error } = await db.from("clients").update(values).eq("id", input.id).eq("user_id", user).select(selection).single();
  if (error) return fail("Impossible de modifier le client.", 409);
  return NextResponse.json({ client: data });
}

export async function DELETE(request: Request) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return fail("Client introuvable.", 400);
  const { error } = await db.from("clients").delete().eq("id", id).eq("user_id", user);
  if (error) return fail("Impossible de supprimer le client.", 409);
  return NextResponse.json({ deleted: true });
}
