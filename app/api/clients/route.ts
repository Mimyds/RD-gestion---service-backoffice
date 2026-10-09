import { NextResponse } from "next/server";
import { authenticated, fail, isUuid, rateLimited, readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const selection = "id,type,company_name,first_name,last_name,email,phone,address_line1,address_line2,postal_code,city,country,siret,vat_number,notes";

function parse(input: Record<string, unknown>) {
  const type = input.type === "particulier" ? "particulier" : "entreprise";
  const value = (key: string, max: number) => typeof input[key] === "string" ? input[key].trim().slice(0, max) || null : null;
  const companyName = value("companyName", 200);
  const firstName = value("firstName", 120);
  const lastName = value("lastName", 120);
  if ((type === "entreprise" && !companyName) || (type === "particulier" && !firstName && !lastName)) return null;
  return {
    type,
    company_name: type === "entreprise" ? companyName : null,
    first_name: type === "particulier" ? firstName : null,
    last_name: type === "particulier" ? lastName : null,
    email: value("email", 254),
    phone: value("phone", 50),
    address_line1: value("addressLine1", 300),
    address_line2: value("addressLine2", 300),
    postal_code: value("postalCode", 20),
    city: value("city", 120),
    country: value("country", 120) || "France",
    siret: value("siret", 30),
    vat_number: value("vatNumber", 40),
    notes: value("notes", 5_000)
  };
}

async function readInput(request: Request) {
  const result = await readJsonBody<Record<string, unknown>>(request);
  if (result.response) return result;
  return result.data && typeof result.data === "object" && !Array.isArray(result.data)
    ? result
    : { response: fail("Données invalides.", 400) };
}

export async function GET() {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "clients:read", 120); if (limited) return limited;
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
  const limited = await rateLimited(db, "clients:write"); if (limited) return limited;
  const body = await readInput(request); if (body.response) return body.response;
  const input = body.data!;
  const values = parse(input);
  if (!values) return fail("Le nom du client est requis.", 400);
  const { data, error } = await db.from("clients").insert({ user_id: user, ...values }).select(selection).single();
  if (error) return fail("Impossible d’enregistrer le client.", 409);
  return NextResponse.json({ client: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "clients:write"); if (limited) return limited;
  const body = await readInput(request); if (body.response) return body.response;
  const input = body.data!;
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
  const limited = await rateLimited(db, "clients:write"); if (limited) return limited;
  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return fail("Client introuvable.", 400);
  const { error } = await db.from("clients").delete().eq("id", id).eq("user_id", user);
  if (error) return fail("Impossible de supprimer le client.", 409);
  return NextResponse.json({ deleted: true });
}
