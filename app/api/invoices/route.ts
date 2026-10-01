import { NextResponse } from "next/server";
import { authenticated, fail, isUuid } from "@/lib/api";
import { COMPANY_ADDRESS, COMPANY_DETAILS, COMPANY_NAME } from "@/lib/company";
export const dynamic = "force-dynamic";
const issuer = { issuer: COMPANY_NAME, issuerAddress: COMPANY_ADDRESS, issuerDetails: COMPANY_DETAILS };
export async function GET() {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  const [rows, profile] = await Promise.all([db.from("invoices").select("id,client_id,payload,status,number").eq("user_id", user).order("created_at", { ascending: false }), db.from("users").select("invoice_template").eq("id", user).maybeSingle()]);
  if (rows.error || profile.error) return fail("Données indisponibles. Vérifiez la configuration de Supabase.", 503);
  const template = (profile.data?.invoice_template || {}) as { bankDetails?: string; legalMentions?: string };
  return NextResponse.json({
    invoices: (rows.data || []).map(row => {
      const payload = row.payload as Record<string, unknown>;
      const notes = typeof payload.notes === "string" && payload.notes.trim() ? payload.notes : template.legalMentions || "";
      const bankDetails = typeof payload.bankDetails === "string" && payload.bankDetails.trim() ? payload.bankDetails : template.bankDetails || "";
      return { ...payload, ...issuer, notes, bankDetails, id: row.id, clientId: row.client_id, status: row.status, number: row.number };
    })
  });
}
function valid(i: any) { return i && typeof i.number === "string" && i.number.trim().length > 0 && i.number.length <= 80 && typeof i.client === "string" && i.client.trim().length > 0 && ["brouillon","envoyée","payée"].includes(i.status) && ["EUR","USD"].includes(i.currency) && /^\d{4}-\d{2}-\d{2}$/.test(i.issueDate) && /^\d{4}-\d{2}-\d{2}$/.test(i.dueDate) && Array.isArray(i.lines) && i.lines.length > 0 && i.lines.length <= 100 && i.lines.every((l: any) => typeof l.description === "string" && l.description.trim() && Number.isFinite(l.quantity) && l.quantity >= 0 && Number.isFinite(l.unitPrice) && l.unitPrice >= 0 && Number.isFinite(l.taxRate) && l.taxRate >= 0 && l.taxRate <= 100); }
async function write(request: Request, updating: boolean) {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  let input: any; try { input = await request.json(); } catch { return fail("Données invalides.", 400); }
  if (!valid(input) || JSON.stringify(input).length > 100000) return fail("Vérifiez les champs de la facture.", 400);
  const { id: _id, clientId: _clientId, ...inputPayload } = input;
  const payload = { ...inputPayload, ...issuer };
  if (updating && !isUuid(input.id)) return fail("Identifiant invalide.", 400);
  const clientId = isUuid(input.clientId) ? input.clientId : null;
  const result = updating ? await db.from("invoices").update({ client_id: clientId, number: input.number, status: input.status, payload }).eq("id", input.id).eq("user_id", user).select("id").single() : await db.from("invoices").insert({ user_id: user, client_id: clientId, number: input.number, status: input.status, payload }).select("id").single();
  if (result.error) return fail(result.error.code === "23505" ? "Ce numéro de facture existe déjà." : "Enregistrement impossible.", 409);
  return NextResponse.json({ invoice: { ...payload, id: result.data.id } });
}
export async function POST(request: Request) { return write(request, false); }
export async function PUT(request: Request) { return write(request, true); }
export async function DELETE(request: Request) {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  const id = new URL(request.url).searchParams.get("id"); if (!isUuid(id)) return fail("Identifiant manquant.", 400);
  const { error } = await db.from("invoices").delete().eq("id", id).eq("user_id", user);
  return error ? fail("Suppression impossible.", 503) : NextResponse.json({ ok: true });
}
