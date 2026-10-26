"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClientRecord } from "@/components/client-manager";
import { DatePicker } from "@/components/date-picker";
import { ErrorBanner } from "@/components/error-banner";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { clientAddress, clientName } from "@/lib/clients";
import { apiFetch } from "@/lib/http";
import { blankLine, type Invoice, type InvoiceLine, money, total } from "@/lib/invoices";
import { type InvoiceFieldErrors, validateInvoice } from "@/lib/invoice-validation";
import { InlineClientForm, blankClient, clientDraftName, clientDraftAddress, validateClientDraft, type ClientDraft } from "@/components/inline-client-form";

const NEW_CLIENT = "__new__";
const LEGACY_CLIENT = "__legacy__";
function ValidationError({ message }: { message?: string }) { return message ? <span role="alert" className="text-sm font-normal text-destructive">{message}</span> : null; }
const tw = {
  primary: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 py-2.5 font-semibold whitespace-nowrap text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-semibold whitespace-nowrap text-foreground hover:bg-accent",
  formScroll: "flex flex-col gap-4 overflow-auto px-0.5 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-muted-foreground [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-[15px] [&_input]:text-foreground [&_input]:outline-ring [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-[15px] [&_select]:text-foreground [&_textarea]:min-w-0 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-[15px] [&_textarea]:text-foreground [&_[aria-invalid=true]]:border-destructive [&_[aria-invalid=true]]:ring-3 [&_[aria-invalid=true]]:ring-destructive/20",
  formGrid: "grid grid-cols-2 gap-3 max-[700px]:grid-cols-1",
  lineForm: "grid grid-cols-[minmax(90px,1fr)_minmax(160px,2fr)_repeat(2,minmax(75px,1fr))_36px] items-end gap-2.5 max-[700px]:grid-cols-2",
  iconButton: "inline-grid place-items-center border-0 bg-transparent p-2.5 text-muted-foreground",
  textButton: "flex items-center gap-1.5 border-0 bg-transparent px-0 pt-1 pb-4 text-sm font-semibold text-ring",
  formTotal: "flex justify-end gap-10 border-t py-4 text-lg",
  formActions: "flex justify-end gap-2.5",
} as const;

export function InvoiceEditor({ initial, clients, error, onError, onCancel, onSaved }: {
  initial: Invoice;
  clients: ClientRecord[];
  error: string;
  onError: (message: string) => void;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [editor, setEditor] = useState(initial);
  const [clientSelection, setClientSelection] = useState(initial.id ? initial.clientId || LEGACY_CLIENT : NEW_CLIENT);
  const [clientDraft, setClientDraft] = useState<ClientDraft>(blankClient);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<InvoiceFieldErrors>({});

  function clearError(key: string) { setFieldErrors(current => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; }); }
  function chooseClient(value: string) { clearError("client"); setClientSelection(value); if (value === NEW_CLIENT) { setClientDraft(blankClient()); setEditor(p => ({ ...p, clientId: null, client: "", clientType: "entreprise", clientAddress: "", clientEmail: "", clientSiret: "", clientVatNumber: "" })); return; } const selected = clients.find(client => client.id === value); if (selected) setEditor(p => ({ ...p, clientId: selected.id, client: clientName(selected), clientType: selected.type, clientAddress: clientAddress(selected), clientEmail: selected.email || "", clientSiret: selected.siret || "", clientVatNumber: selected.vat_number || "" })); }
  function clientField<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) { clearError(`clientDraft.${key}`); clearError("client"); setClientDraft(current => ({ ...current, [key]: value })); }
  function field<K extends keyof Invoice>(key: K, value: Invoice[K]) { clearError(String(key)); setEditor(p => ({ ...p, [key]: value })); }
  function line(index: number, key: keyof InvoiceLine, value: string | number) { clearError(`lines.${index}.${String(key)}`); setEditor(p => ({ ...p, lines: p.lines.map((l, n) => n === index ? { ...l, [key]: value } : l) })); }
  async function save() {
    const draftName = clientDraftName(clientDraft);
    const candidate = clientSelection === NEW_CLIENT ? { ...editor, client: draftName, clientType: clientDraft.type, clientAddress: clientDraftAddress(clientDraft), clientEmail: clientDraft.email, clientSiret: clientDraft.type === "entreprise" ? clientDraft.siret : "", clientVatNumber: clientDraft.type === "entreprise" ? clientDraft.vatNumber : "" } : editor;
    const errors = validateInvoice(candidate);
    if (clientSelection === NEW_CLIENT) {
      if (!draftName) errors[clientDraft.type === "entreprise" ? "clientDraft.companyName" : "clientDraft.firstName"] = clientDraft.type === "entreprise" ? "La raison sociale est requise." : "Renseignez au moins le prénom ou le nom.";
      if (clientDraft.email && !/^\S+@\S+\.\S+$/.test(clientDraft.email)) errors["clientDraft.email"] = "Saisissez une adresse e-mail valide.";
      Object.assign(errors, validateClientDraft(clientDraft));
      if (errors.clientAddress) errors["clientDraft.addressLine1"] = errors.clientAddress;
      if (errors.clientEmail) errors["clientDraft.email"] = errors.clientEmail;
      delete errors.client;
      delete errors.clientAddress;
      delete errors.clientEmail;
      delete errors.clientSiret;
      delete errors.clientVatNumber;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) { onError(""); return; }

    setSaving(true); onError("");
    try { let invoice = candidate; if (clientSelection === NEW_CLIENT) { const clientResponse = await apiFetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...clientDraft, siret: candidate.clientSiret, vatNumber: candidate.clientVatNumber }) }); const clientData = await clientResponse.json(); if (!clientResponse.ok) throw Error(clientData.error || "Enregistrement du client impossible."); const created = clientData.client as ClientRecord; invoice = { ...candidate, clientId: created.id, client: clientName(created), clientType: created.type, clientAddress: clientAddress(created), clientEmail: created.email || "", clientSiret: created.siret || "", clientVatNumber: created.vat_number || "" }; setEditor(invoice); setClientSelection(created.id); } const r = await apiFetch("/api/invoices", { method: invoice.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invoice) }); const d = await r.json(); if (!r.ok) { if (d.fieldErrors) { setFieldErrors(d.fieldErrors); return; } throw Error(d.error || "Enregistrement impossible."); } await onSaved(); } catch (e) { onError(e instanceof Error ? e.message : "Enregistrement impossible."); } finally { setSaving(false); }
  }

  return <>
<ErrorBanner message={error} onDismiss={() => onError("")}/>
<div className={tw.formScroll}>
<FieldSet className="gap-4 rounded-xl border bg-muted/20 p-5 max-[700px]:p-4">
<FieldLegend className="px-1">Informations de la facture</FieldLegend>
<div className={tw.formGrid}>
<label>Numéro de facture<input aria-invalid={Boolean(fieldErrors.number) || undefined} value={editor.number} onChange={e => field("number", e.target.value)}/><ValidationError message={fieldErrors.number}/>
</label>
<label>Devise<select aria-invalid={Boolean(fieldErrors.currency) || undefined} value={editor.currency} onChange={e => field("currency", e.target.value)}>
<option>EUR</option>
<option>USD</option>
</select><ValidationError message={fieldErrors.currency}/>
</label>
<label>Date d’émission<DatePicker ariaLabel="Date d’émission" ariaInvalid={Boolean(fieldErrors.issueDate)} value={editor.issueDate} onChange={value => field("issueDate", value)}/><ValidationError message={fieldErrors.issueDate}/>
</label>
<label>Date d’échéance<DatePicker ariaLabel="Date d’échéance" ariaInvalid={Boolean(fieldErrors.dueDate)} value={editor.dueDate} onChange={value => field("dueDate", value)}/><ValidationError message={fieldErrors.dueDate}/>
</label>
<label>N° de bon de commande<input aria-invalid={Boolean(fieldErrors.purchaseOrderNumber) || undefined} value={editor.purchaseOrderNumber || ""} onChange={e => field("purchaseOrderNumber", e.target.value)} placeholder="Si communiqué par le client"/><ValidationError message={fieldErrors.purchaseOrderNumber}/>
</label>
</div>
</FieldSet>
<FieldSet className="gap-4 rounded-xl border bg-muted/20 p-5 max-[700px]:p-4">
<FieldLegend className="px-1">Votre entreprise</FieldLegend>
<div className="mb-4 grid gap-1 rounded-lg border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground [&_span]:whitespace-pre-line [&_strong]:text-foreground"><strong>{editor.issuer}</strong><span>{editor.issuerAddress}</span><span>{editor.issuerDetails}</span><span>{editor.issuerSiret ? `SIRET : ${editor.issuerSiret}` : "SIRET non renseigné"}</span><small className="mt-1">{editor.status === "brouillon" ? "Ces informations se modifient dans Réglages et suivent les réglages tant que la facture est un brouillon." : "Informations figées au moment de l’envoi de la facture."}</small></div>
</FieldSet>
<FieldSet className="gap-4 rounded-xl border bg-muted/20 p-5 max-[700px]:p-4">
<FieldLegend className="px-1">Client</FieldLegend>
<label>Choisir un client<select aria-invalid={Boolean(fieldErrors.client) || undefined} value={clientSelection} onChange={e => chooseClient(e.target.value)}>
{clientSelection === LEGACY_CLIENT && <option value={LEGACY_CLIENT}>Client de cette facture (ancienne fiche)</option>}
<option value={NEW_CLIENT}>+ Ajouter un nouveau client</option>
{clients.map(client => <option key={client.id} value={client.id}>{clientName(client)}</option>)}
</select><ValidationError message={fieldErrors.client}/>
</label>
{clientSelection === NEW_CLIENT ? <div className="mb-4 rounded-lg border bg-muted/30 p-4">
<InlineClientForm clientDraft={clientDraft} clientField={clientField} fieldErrors={fieldErrors}/>
</div> : <div className="mb-4 grid gap-1 rounded-lg border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground [&_span]:whitespace-pre-line [&_strong]:text-foreground"><strong>{editor.client}</strong><span>{editor.clientAddress || "Adresse non renseignée"}</span><ValidationError message={fieldErrors.clientAddress}/><span>{editor.clientEmail || "E-mail non renseigné"}</span><ValidationError message={fieldErrors.clientEmail}/>{editor.clientSiret ? <span>SIRET : {editor.clientSiret}</span> : null}<ValidationError message={fieldErrors.clientSiret}/></div>}
<div className={tw.formGrid}>
<label>Suivi par *<input required aria-required="true" aria-invalid={Boolean(fieldErrors.followedBy) || undefined} value={editor.followedBy || ""} onChange={e => field("followedBy", e.target.value)} placeholder="Nom du contact"/><ValidationError message={fieldErrors.followedBy}/>
</label>
<label>Objet<input aria-invalid={Boolean(fieldErrors.purpose) || undefined} value={editor.purpose || ""} onChange={e => field("purpose", e.target.value)} placeholder="Prestation de service"/><ValidationError message={fieldErrors.purpose}/>
</label>
</div>
</FieldSet>
<FieldSet className="gap-4 rounded-xl border bg-muted/20 p-5 max-[700px]:p-4">
<FieldLegend className="px-1">Prestations</FieldLegend>
<ValidationError message={fieldErrors.lines}/>
{editor.lines.map((l, index) => <div className={tw.lineForm} key={index}>
<label>Période<input aria-invalid={Boolean(fieldErrors[`lines.${index}.period`]) || undefined} value={l.period || ""} onChange={e => line(index, "period", e.target.value)} placeholder="Période"/><ValidationError message={fieldErrors[`lines.${index}.period`]}/>
</label>
<label className="max-[700px]:col-span-full">Description<input aria-invalid={Boolean(fieldErrors[`lines.${index}.description`]) || undefined} value={l.description} onChange={e => line(index, "description", e.target.value)} placeholder="Prestation ou produit"/><ValidationError message={fieldErrors[`lines.${index}.description`]}/>
</label>
<label>Qté<input aria-invalid={Boolean(fieldErrors[`lines.${index}.quantity`]) || undefined} type="number" min="0" step="any" value={l.quantity} onChange={e => line(index, "quantity", Number(e.target.value))}/><ValidationError message={fieldErrors[`lines.${index}.quantity`]}/>
</label>
<label>Prix unitaire<input aria-invalid={Boolean(fieldErrors[`lines.${index}.unitPrice`]) || undefined} type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => line(index, "unitPrice", Number(e.target.value))}/><ValidationError message={fieldErrors[`lines.${index}.unitPrice`]}/>
</label>
<button type="button" aria-label="Retirer la ligne" className={tw.iconButton} disabled={editor.lines.length === 1} onClick={() => field("lines", editor.lines.filter((_, n) => n !== index))}>
<Trash2 size={17}/>
</button>
</div>)}<button type="button" className={tw.textButton} onClick={() => field("lines", [...editor.lines, blankLine()])}>
<Plus size={16}/> Ajouter une ligne</button>
</FieldSet>
<FieldSet className="gap-4 rounded-xl border bg-muted/20 p-5 max-[700px]:p-4">
<FieldLegend className="px-1">Notes et règlement</FieldLegend>
<label>Notes et modalités<textarea aria-invalid={Boolean(fieldErrors.notes) || undefined} className="min-h-44 resize-y" rows={8} value={editor.notes} onChange={e => field("notes", e.target.value)} placeholder="Conditions de règlement, coordonnées bancaires..."/><ValidationError message={fieldErrors.notes}/>
</label>
<div className={tw.formTotal}>
<span>Total</span>
<strong>{money(total(editor), editor.currency)}</strong>
</div>
</FieldSet>
<div className={tw.formActions}>
<button type="button" className={tw.outline} onClick={onCancel}>Annuler</button>
<button type="button" className={tw.primary} disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer la facture"}</button>
</div>
</div>
</>;
}
