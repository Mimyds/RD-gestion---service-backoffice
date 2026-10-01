"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClientRecord } from "@/components/client-manager";
import { DatePicker } from "@/components/date-picker";
import { ErrorBanner } from "@/components/error-banner";
import { clientAddress, clientName } from "@/lib/clients";
import { COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE } from "@/lib/company";
import { blankLine, type Invoice, type InvoiceLine, money, total } from "@/lib/invoices";

type ClientDraft = { type: "entreprise" | "particulier"; companyName: string; firstName: string; lastName: string; email: string; phone: string; addressLine1: string; addressLine2: string; postalCode: string; city: string; country: string };
const NEW_CLIENT = "__new__";
const LEGACY_CLIENT = "__legacy__";
const blankClient = (): ClientDraft => ({ type: "entreprise", companyName: "", firstName: "", lastName: "", email: "", phone: "", addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "France" });
const tw = {
  primary: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 py-2.5 font-semibold whitespace-nowrap text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-semibold whitespace-nowrap text-foreground hover:bg-accent",
  formScroll: "overflow-auto px-0.5 [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:border-t [&_h3]:pt-3 [&_h3]:text-sm [&_label]:mb-3 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-muted-foreground [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-[15px] [&_input]:text-foreground [&_input]:outline-ring [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-[15px] [&_select]:text-foreground [&_textarea]:min-w-0 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-[15px] [&_textarea]:text-foreground",
  formGrid: "grid grid-cols-2 gap-3 max-[700px]:grid-cols-1",
  lineForm: "grid grid-cols-[minmax(90px,1fr)_minmax(160px,2fr)_repeat(3,minmax(75px,1fr))_36px] items-end gap-2.5 max-[700px]:grid-cols-2",
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

  function chooseClient(value: string) { setClientSelection(value); if (value === NEW_CLIENT) { setClientDraft(blankClient()); setEditor(p => ({ ...p, clientId: null, client: "", clientAddress: "", clientEmail: "" })); return; } const selected = clients.find(client => client.id === value); if (selected) setEditor(p => ({ ...p, clientId: selected.id, client: clientName(selected), clientAddress: clientAddress(selected), clientEmail: selected.email || "" })); }
  function clientField<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) { setClientDraft(current => ({ ...current, [key]: value })); }
  function field<K extends keyof Invoice>(key: K, value: Invoice[K]) { setEditor(p => ({ ...p, [key]: value })); }
  function line(index: number, key: keyof InvoiceLine, value: string | number) { setEditor(p => ({ ...p, lines: p.lines.map((l, n) => n === index ? { ...l, [key]: value } : l) })); }
  async function save() { if (!editor.number.trim() || editor.lines.some(l => !l.description.trim())) { onError("Renseignez le client, le numéro et chaque prestation."); return; } setSaving(true); onError(""); try { let invoice = editor; if (clientSelection === NEW_CLIENT) { const clientResponse = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientDraft) }); const clientData = await clientResponse.json(); if (!clientResponse.ok) throw Error(clientData.error || "Enregistrement du client impossible."); const created = clientData.client as ClientRecord; invoice = { ...editor, clientId: created.id, client: clientName(created), clientAddress: clientAddress(created), clientEmail: created.email || "" }; setEditor(invoice); setClientSelection(created.id); } if (!invoice.client.trim()) throw Error("Sélectionnez ou ajoutez un client."); const r = await fetch("/api/invoices", { method: invoice.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invoice) }); const d = await r.json(); if (!r.ok) throw Error(d.error || "Enregistrement impossible."); await onSaved(); } catch (e) { onError(e instanceof Error ? e.message : "Enregistrement impossible."); } finally { setSaving(false); } }

  return <>
<ErrorBanner message={error} onDismiss={() => onError("")}/>
<div className={tw.formScroll}>
<div className={tw.formGrid}>
<label>Numéro de facture<input value={editor.number} onChange={e => field("number", e.target.value)}/>
</label>
<label>Devise<select value={editor.currency} onChange={e => field("currency", e.target.value)}>
<option>EUR</option>
<option>USD</option>
</select>
</label>
<label>Date d’émission<DatePicker ariaLabel="Date d’émission" value={editor.issueDate} onChange={value => field("issueDate", value)}/>
</label>
<label>Date d’échéance<DatePicker ariaLabel="Date d’échéance" value={editor.dueDate} onChange={value => field("dueDate", value)}/>
</label>
</div>
<h3>Votre entreprise</h3>
<div className={tw.formGrid}>
<label>Nom ou raison sociale<input value={COMPANY_NAME} readOnly/>
</label>
<label>Adresse<textarea value={COMPANY_ADDRESS} readOnly/>
</label>
</div>
<label>E-mail de l’entreprise<input type="email" value={COMPANY_EMAIL} readOnly/></label>
<label>Téléphone de l’entreprise<input value={COMPANY_PHONE} readOnly/></label>
<h3>Client</h3>
<label>Choisir un client<select value={clientSelection} onChange={e => chooseClient(e.target.value)}>
{clientSelection === LEGACY_CLIENT && <option value={LEGACY_CLIENT}>Client de cette facture (ancienne fiche)</option>}
<option value={NEW_CLIENT}>+ Ajouter un nouveau client</option>
{clients.map(client => <option key={client.id} value={client.id}>{clientName(client)}</option>)}
</select>
</label>
{clientSelection === NEW_CLIENT ? <div className="mb-4 rounded-lg border bg-muted/30 p-4">
<div className={tw.formGrid}>
<label>Type de client<select value={clientDraft.type} onChange={e => clientField("type", e.target.value as ClientDraft["type"])}><option value="entreprise">Entreprise</option><option value="particulier">Particulier</option></select></label>
{clientDraft.type === "entreprise" ? <label>Raison sociale<input value={clientDraft.companyName} onChange={e => clientField("companyName", e.target.value)} placeholder="Nom de l’entreprise"/></label> : <><label>Prénom<input value={clientDraft.firstName} onChange={e => clientField("firstName", e.target.value)} placeholder="Prénom"/></label><label>Nom<input value={clientDraft.lastName} onChange={e => clientField("lastName", e.target.value)} placeholder="Nom"/></label></>}
<label>Adresse<input value={clientDraft.addressLine1} onChange={e => clientField("addressLine1", e.target.value)} placeholder="Numéro et voie"/></label>
<label>Complément d’adresse<input value={clientDraft.addressLine2} onChange={e => clientField("addressLine2", e.target.value)} placeholder="Bâtiment, étage…"/></label>
<label>Code postal<input value={clientDraft.postalCode} onChange={e => clientField("postalCode", e.target.value)} placeholder="69000"/></label>
<label>Ville<input value={clientDraft.city} onChange={e => clientField("city", e.target.value)} placeholder="Lyon"/></label>
<label>Pays<input value={clientDraft.country} onChange={e => clientField("country", e.target.value)} placeholder="France"/></label>
<label>E-mail<input type="email" value={clientDraft.email} onChange={e => clientField("email", e.target.value)} placeholder="client@exemple.fr"/></label>
<label>Téléphone<input type="tel" value={clientDraft.phone} onChange={e => clientField("phone", e.target.value)} placeholder="+33…"/></label>
</div>
</div> : <div className="mb-4 grid gap-1 rounded-lg border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground [&_span]:whitespace-pre-line [&_strong]:text-foreground"><strong>{editor.client}</strong><span>{editor.clientAddress || "Adresse non renseignée"}</span><span>{editor.clientEmail || "E-mail non renseigné"}</span></div>}
<div className={tw.formGrid}>
<label>Suivi par<input value={editor.followedBy || ""} onChange={e => field("followedBy", e.target.value)} placeholder="Nom du contact"/>
</label>
<label>Objet<input value={editor.purpose || ""} onChange={e => field("purpose", e.target.value)} placeholder="Prestation de service"/>
</label>
</div>
<h3>Prestations</h3>{editor.lines.map((l, index) => <div className={tw.lineForm} key={index}>
<label>Période<input value={l.period || ""} onChange={e => line(index, "period", e.target.value)} placeholder="Période"/>
</label>
<label className="max-[700px]:col-span-full">Description<input value={l.description} onChange={e => line(index, "description", e.target.value)} placeholder="Prestation ou produit"/>
</label>
<label>Qté<input type="number" min="0" step="any" value={l.quantity} onChange={e => line(index, "quantity", Number(e.target.value))}/>
</label>
<label>Prix HT<input type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => line(index, "unitPrice", Number(e.target.value))}/>
</label>
<label>Taxe %<input type="number" min="0" step="0.01" value={l.taxRate} onChange={e => line(index, "taxRate", Number(e.target.value))}/>
</label>
<button type="button" aria-label="Retirer la ligne" className={tw.iconButton} disabled={editor.lines.length === 1} onClick={() => field("lines", editor.lines.filter((_, n) => n !== index))}>
<Trash2 size={17}/>
</button>
</div>)}<button type="button" className={tw.textButton} onClick={() => field("lines", [...editor.lines, blankLine()])}>
<Plus size={16}/> Ajouter une ligne</button>
<label>Notes et modalités<textarea value={editor.notes} onChange={e => field("notes", e.target.value)} placeholder="Conditions de règlement, coordonnées bancaires..."/>
</label>
<div className={tw.formTotal}>
<span>Total TTC</span>
<strong>{money(total(editor), editor.currency)}</strong>
</div>
<div className={tw.formActions}>
<button type="button" className={tw.outline} onClick={onCancel}>Annuler</button>
<button type="button" className={tw.primary} disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer la facture"}</button>
</div>
</div>
</>;
}
