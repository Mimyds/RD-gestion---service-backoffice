import { NextResponse } from "next/server";
import { authenticated, fail, isUuid } from "@/lib/api";
import { issuerSnapshot, loadSettings, storedSnapshot } from "@/lib/settings";
export const dynamic = "force-dynamic";
const filled = (value: unknown) => typeof value === "string" && value.trim() ? value : "";
export async function GET() {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  const [rows, profile] = await Promise.all([db.from("invoices").select("id,client_id,payload,status,number").eq("user_id", user).order("created_at", { ascending: false }), loadSettings(db, user)]);
  if (rows.error || profile.error) return fail("Données indisponibles. Vérifiez la configuration de Supabase.", 503);
  const current = issuerSnapshot(profile.settings);
  return NextResponse.json({
    invoices: (rows.data || []).map(row => {
      const payload = row.payload as Record<string, unknown>;
      // Drafts always follow the current settings; other invoices keep their snapshot.
      const company = row.status === "brouillon" ? current : storedSnapshot(payload, current);
      return { ...payload, ...company, notes: filled(payload.notes) || profile.settings.legalMentions, bankDetails: filled(payload.bankDetails) || profile.settings.bankDetails, id: row.id, clientId: row.client_id, status: row.status, number: row.number };
    })
  });
}
function valid(i: any) { return i && typeof i.number === "string" && i.number.trim().length > 0 && i.number.length <= 80 && typeof i.client === "string" && i.client.trim().length > 0 && ["brouillon","envoyée","payée"].includes(i.status) && ["EUR","USD"].includes(i.currency) && /^\d{4}-\d{2}-\d{2}$/.test(i.issueDate) && /^\d{4}-\d{2}-\d{2}$/.test(i.dueDate) && Array.isArray(i.lines) && i.lines.length > 0 && i.lines.length <= 100 && i.lines.every((l: any) => typeof l.description === "string" && l.description.trim() && Number.isFinite(l.quantity) && l.quantity >= 0 && Number.isFinite(l.unitPrice) && l.unitPrice >= 0 && Number.isFinite(l.taxRate) && l.taxRate >= 0 && l.taxRate <= 100); }
async function write(request: Request, updating: boolean) {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  let input: any; try { input = await request.json(); } catch { return fail("Données invalides.", 400); }
  if (!valid(input) || JSON.stringify(input).length > 100000) return fail("Vérifiez les champs de la facture.", 400);
  if (updating && !isUuid(input.id)) return fail("Identifiant invalide.", 400);
  const profile = await loadSettings(db, user);
  if (profile.error) return fail("Réglages indisponibles.", 503);
  let company = issuerSnapshot(profile.settings);
  if (updating) {
    const existing = await db.from("invoices").select("status,payload").eq("id", input.id).eq("user_id", user).maybeSingle();
    if (existing.error || !existing.data) return fail("Facture introuvable.", 404);
    // The company block is frozen once the invoice has left draft.
    if (existing.data.status !== "brouillon") company = storedSnapshot(existing.data.payload as Record<string, unknown>, company);
  }
  const { id: _id, clientId: _clientId, ...inputPayload } = input;
  const payload = { ...inputPayload, ...company };
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
