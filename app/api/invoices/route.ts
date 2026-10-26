import { NextResponse } from "next/server";
import { authenticated, fail, isUuid, rateLimited, readJsonBody } from "@/lib/api";
import { isAllowedLockedStatusChange, isInvoiceLocked } from "@/lib/invoice-lifecycle";
import { validateInvoice } from "@/lib/invoice-validation";
import { issuerSnapshot, loadSettings, storedSnapshot } from "@/lib/settings";
import { normalizeFrenchVatNumber } from "@/lib/vat-number";
export const dynamic = "force-dynamic";
const filled = (value: unknown) => typeof value === "string" && value.trim() ? value : "";
export async function GET() {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "invoices:read", 120); if (limited) return limited;
  const [rows, profile] = await Promise.all([db.from("invoices").select("id,client_id,payload,status,number").eq("user_id", user).order("created_at", { ascending: false }), loadSettings(db, user)]);
  if (rows.error || profile.error) return fail("Données indisponibles. Vérifiez la configuration de Supabase.", 503);
  const current = issuerSnapshot(profile.settings);
  return NextResponse.json({
    invoices: (rows.data || []).map(row => {
      const payload = row.payload as Record<string, unknown>;
      // Drafts always follow the current settings; other invoices keep their snapshot.
      const company = row.status === "brouillon" ? current : storedSnapshot(payload, current);
      return { ...payload, ...company, serviceDate: filled(payload.serviceDate) || filled(payload.issueDate), operationCategory: filled(payload.operationCategory) || "services", clientType: filled(payload.clientType) || "entreprise", clientSiret: filled(payload.clientSiret), clientVatNumber: filled(payload.clientVatNumber), purchaseOrderNumber: filled(payload.purchaseOrderNumber), notes: filled(payload.notes) || profile.settings.legalMentions, followedBy: filled(payload.followedBy) || profile.settings.accountName, bankDetails: filled(payload.bankDetails) || profile.settings.bankDetails, id: row.id, clientId: row.client_id, status: row.status, number: row.number };
    })
  });
}
async function write(request: Request, updating: boolean) {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "invoices:write"); if (limited) return limited;
  const body = await readJsonBody<any>(request, 100_000); if (body.response) return body.response;
  const input = body.data;
  if (updating && !isUuid(input?.id)) return fail("Identifiant invalide.", 400);
  if (!updating && input?.status !== "brouillon") return fail("Une nouvelle facture doit être enregistrée comme brouillon.", 409);

  if (updating) {
    const existing = await db.from("invoices").select("status,payload,client_id,number").eq("id", input.id).eq("user_id", user).maybeSingle();
    if (existing.error || !existing.data) return fail("Facture introuvable.", 404);

    if (isInvoiceLocked(existing.data.status)) {
      if (!isAllowedLockedStatusChange(existing.data.status, input?.status)) {
        return fail("Une facture envoyée ou payée ne peut plus être modifiée.", 409);
      }

      const result = await db
        .from("invoices")
        .update({ status: "payée" })
        .eq("id", input.id)
        .eq("user_id", user)
        .eq("status", "envoyée")
        .select("id")
        .maybeSingle();
      if (result.error || !result.data) return fail("Le statut de la facture a changé. Rechargez la page.", 409);
      return NextResponse.json({
        invoice: {
          ...(existing.data.payload as Record<string, unknown>),
          id: result.data.id,
          clientId: existing.data.client_id,
          number: existing.data.number,
          status: "payée",
        },
      });
    }
  }

  const fieldErrors = validateInvoice(input);
  if (Object.keys(fieldErrors).length || JSON.stringify(input).length > 100000) {
    return NextResponse.json({ error: "Certains champs de la facture sont invalides.", fieldErrors }, { status: 400 });
  }
  if (updating && input.status === "payée") return fail("Une facture doit être marquée envoyée avant d’être payée.", 409);
  const profile = await loadSettings(db, user);
  if (profile.error) return fail("Réglages indisponibles.", 503);
  if (input.status === "envoyée" && !profile.settings.siret) return fail("Renseignez le SIRET de l’entreprise dans les réglages avant d’envoyer la facture.", 409);
  if (input.status === "envoyée" && input.clientType === "entreprise" && !input.clientSiret) return fail("Renseignez le SIRET du client professionnel avant d’envoyer la facture.", 409);
  if (input.status === "envoyée" && input.clientType === "entreprise" && !input.clientAddress.trim()) return fail("Renseignez l’adresse de facturation du client professionnel avant d’envoyer la facture.", 409);
  if (input.status === "envoyée" && !input.notes.trim()) return fail("Renseignez les conditions de règlement et les mentions légales avant d’envoyer la facture.", 409);
  if (input.status === "envoyée" && !/TVA/i.test(input.notes)) return fail("Précisez dans les mentions légales le motif d’exonération ou de non-application de la TVA.", 409);
  let company = issuerSnapshot(profile.settings);
  if (updating) {
    // Drafts use the current company settings until they are sent.
    company = issuerSnapshot(profile.settings);
  }
  const payload = {
    number: input.number.trim(),
    client: input.client.trim(),
    clientType: input.clientType,
    clientAddress: input.clientAddress.trim(),
    clientEmail: input.clientEmail.trim(),
    clientSiret: input.clientSiret.trim(),
    clientVatNumber: input.clientVatNumber.trim() ? normalizeFrenchVatNumber(input.clientVatNumber) : "",
    purchaseOrderNumber: input.purchaseOrderNumber.trim(),
    issueDate: input.issueDate,
    serviceDate: input.serviceDate,
    dueDate: input.dueDate,
    operationCategory: input.operationCategory,
    status: input.status,
    currency: input.currency,
    lines: input.lines.map((line: any) => ({
      period: typeof line.period === "string" ? line.period.trim() : "",
      description: line.description.trim(),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: 0,
    })),
    notes: input.notes.trim(),
    followedBy: typeof input.followedBy === "string" ? input.followedBy.trim() : "",
    purpose: typeof input.purpose === "string" ? input.purpose.trim() : "",
    ...company,
  };
  const clientId = isUuid(input.clientId) ? input.clientId : null;
  const result = updating
    ? await db.from("invoices").update({ client_id: clientId, number: input.number, status: input.status, payload }).eq("id", input.id).eq("user_id", user).eq("status", "brouillon").select("id").maybeSingle()
    : await db.from("invoices").insert({ user_id: user, client_id: clientId, number: input.number, status: input.status, payload }).select("id").single();
  if (result.error) return fail(result.error.code === "23505" ? "Ce numéro de facture existe déjà." : "Enregistrement impossible.", 409);
  if (!result.data) return fail("Le statut de la facture a changé. Rechargez la page.", 409);
  return NextResponse.json({ invoice: { ...payload, id: result.data.id } });
}
export async function POST(request: Request) { return write(request, false); }
export async function PUT(request: Request) { return write(request, true); }
export async function DELETE(request: Request) {
  const { db, user } = await authenticated(); if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "invoices:write"); if (limited) return limited;
  const id = new URL(request.url).searchParams.get("id"); if (!isUuid(id)) return fail("Identifiant manquant.", 400);
  const { data, error } = await db.from("invoices").delete().eq("id", id).eq("user_id", user).eq("status", "brouillon").select("id").maybeSingle();
  if (error) return fail("Suppression impossible.", 503);
  if (!data) return fail("Seuls les brouillons peuvent être supprimés.", 409);
  return NextResponse.json({ ok: true });
}
