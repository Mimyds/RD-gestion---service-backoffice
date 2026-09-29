"use client";
import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, Printer, Trash2, Check, Send, X } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/date-picker";

type Line = { period?: string; description: string; quantity: number; unitPrice: number; taxRate: number };
type Invoice = { id: string; clientId?: string | null; number: string; client: string; clientAddress: string; clientEmail: string; issueDate: string; dueDate: string; status: "brouillon" | "envoyée" | "payée"; lines: Line[]; notes: string; followedBy?: string; purpose?: string; bankDetails?: string; issuer: string; issuerAddress: string; issuerDetails: string; currency: string };
type Client = { id: string; type: "entreprise" | "particulier"; company_name: string | null; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; address_line1: string | null; address_line2: string | null; postal_code: string | null; city: string | null; country: string | null };
type ClientDraft = { type: "entreprise" | "particulier"; companyName: string; firstName: string; lastName: string; email: string; phone: string; addressLine1: string; addressLine2: string; postalCode: string; city: string; country: string };
const DEFAULT_ISSUER = "RD GESTION & SERVICES";
const DEFAULT_ISSUER_ADDRESS = "9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS";
const DEFAULT_ISSUER_EMAIL = "remy.desroses@gmail.com";
const DEFAULT_ISSUER_PHONE = "+33(0) 787 330 553";
const DEFAULT_ISSUER_DETAILS = `${DEFAULT_ISSUER_EMAIL}\n${DEFAULT_ISSUER_PHONE}`;
const NEW_CLIENT = "__new__";
const DEFAULT_BANK_DETAILS = `Banque : BANQUE POPULAIRE
Titulaire du compte : M DESROSES - CALTON
Coordonnées bancaires : BP AURA BELLEVILLE
IBAN : FR76 1680 7004 0081 9324 3019 097
Code BIC : CCBPFRPPGRE
Chèque : RD GESTION & SERVICES - M DESROSES RÉMY, 9 impasse Gizeh - 69220 Belleville en Beaujolais`;
const DEFAULT_LEGAL_MENTIONS = `TVA non applicable - article 293 B du CGI
Nos factures sont payables au comptant, sans escompte. Le client, donneur d'ordre, qu'il agisse en son nom personnel ou comme mandataire d'un tiers, reste, en tout état de cause, personnellement redevable du coût de la prestation commandée et facturée.
Pénalité de retard : 3 fois le taux d'intérêt légal (loi 92-1442 du 31/12/1992, et loi 2001-420 du 15/05/2001). Indemnité forfaitaire pour frais de recouvrement : 40 €.`;
const DEFAULT_INVOICE_FOOTER = `RD GESTION & SERVICES - SASU au capital de 150 € - Siège social : 9 impasse Gizeh - 69220 BELLEVILLE EN BEAUJOLAIS - 899 050 553 R.C.S
VILLEFRANCHE - TARARE`;
const today = () => new Date().toISOString().slice(0, 10);
const blankClient = (): ClientDraft => ({ type: "entreprise", companyName: "", firstName: "", lastName: "", email: "", phone: "", addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "France" });
const blank = (): Invoice => ({ id: "", clientId: null, number: "", client: "", clientAddress: "", clientEmail: "", issueDate: today(), dueDate: today(), status: "brouillon", lines: [{ description: "", quantity: 1, unitPrice: 0, taxRate: 0 }], notes: DEFAULT_LEGAL_MENTIONS, followedBy: "", purpose: "PRESTATION DE SERVICE", bankDetails: DEFAULT_BANK_DETAILS, issuer: DEFAULT_ISSUER, issuerAddress: DEFAULT_ISSUER_ADDRESS, issuerDetails: DEFAULT_ISSUER_DETAILS, currency: "EUR" });
const clientName = (client: Client) => client.type === "entreprise" ? client.company_name || "" : [client.first_name, client.last_name].filter(Boolean).join(" ");
const clientAddress = (client: Client) => [client.address_line1, client.address_line2, [client.postal_code, client.city].filter(Boolean).join(" "), client.country].filter(Boolean).join("\n");
const money = (n: number, currency = "EUR") => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(n);
const base = (i: Invoice) => i.lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0);
const total = (i: Invoice) => i.lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0) * (1 + Number(l.taxRate || 0) / 100), 0);

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editor, setEditor] = useState<Invoice | null>(null), [preview, setPreview] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]), [clientSelection, setClientSelection] = useState(NEW_CLIENT), [clientDraft, setClientDraft] = useState<ClientDraft>(blankClient);
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("toutes"), [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ issuer: DEFAULT_ISSUER, issuerAddress: DEFAULT_ISSUER_ADDRESS, issuerDetails: DEFAULT_ISSUER_DETAILS });
  async function refresh() { try { const [invoiceResponse, clientResponse] = await Promise.all([fetch("/api/invoices"), fetch("/api/clients")]); if (!invoiceResponse.ok || !clientResponse.ok) throw Error(); const [invoiceData, clientData] = await Promise.all([invoiceResponse.json(), clientResponse.json()]); setInvoices(invoiceData.invoices); setClients(clientData.clients); setProfile({ issuer: DEFAULT_ISSUER, issuerAddress: DEFAULT_ISSUER_ADDRESS, issuerDetails: DEFAULT_ISSUER_DETAILS }); setError(""); } catch { setError("Impossible de charger vos factures et clients. Réessayez dans un instant."); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({ name: "start_invoice_creation", title: "Nouvelle facture", description: "Ouvre le formulaire de création d'une facture dans l'interface.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { start(); return { opened: true }; } }, { signal: lifecycle.signal })).catch(console.error);
    return () => lifecycle.abort();
  }, [invoices, profile]);
  const shown = useMemo(() => invoices.filter(i => (filter === "toutes" || i.status === filter) && `${i.number} ${i.client}`.toLowerCase().includes(query.toLowerCase())), [invoices, filter, query]);
  const due = invoices.filter(i => i.status === "envoyée").reduce((s, i) => s + total(i), 0), paid = invoices.filter(i => i.status === "payée").reduce((s, i) => s + total(i), 0);
  function start() { setClientSelection(NEW_CLIENT); setClientDraft(blankClient()); setEditor({ ...blank(), issuerDetails: profile.issuerDetails, number: `FAC-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}` }); }
  function editInvoice(invoice: Invoice) { setClientSelection(invoice.clientId || "__legacy__"); setClientDraft(blankClient()); setEditor(invoice); setPreview(null); }
  function chooseClient(value: string) { setClientSelection(value); if (value === NEW_CLIENT) { setClientDraft(blankClient()); setEditor(p => p ? { ...p, clientId: null, client: "", clientAddress: "", clientEmail: "" } : p); return; } const selected = clients.find(client => client.id === value); if (selected) setEditor(p => p ? { ...p, clientId: selected.id, client: clientName(selected), clientAddress: clientAddress(selected), clientEmail: selected.email || "" } : p); }
  function clientField<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) { setClientDraft(current => ({ ...current, [key]: value })); }
  function field<K extends keyof Invoice>(key: K, value: Invoice[K]) { setEditor(p => p ? { ...p, [key]: value } : p); }
  function line(index: number, key: keyof Line, value: string | number) { setEditor(p => p ? { ...p, lines: p.lines.map((l, n) => n === index ? { ...l, [key]: value } : l) } : p); }
  async function save() { if (!editor?.number.trim() || editor.lines.some(l => !l.description.trim())) { setError("Renseignez le client, le numéro et chaque prestation."); return; } setSaving(true); setError(""); try { let invoice = editor; if (clientSelection === NEW_CLIENT) { const clientResponse = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientDraft) }); const clientData = await clientResponse.json(); if (!clientResponse.ok) throw Error(clientData.error || "Enregistrement du client impossible."); const created = clientData.client as Client; invoice = { ...editor, clientId: created.id, client: clientName(created), clientAddress: clientAddress(created), clientEmail: created.email || "" }; } if (!invoice.client.trim()) throw Error("Sélectionnez ou ajoutez un client."); const r = await fetch("/api/invoices", { method: invoice.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invoice) }); const d = await r.json(); if (!r.ok) throw Error(d.error || "Enregistrement impossible."); setEditor(null); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); } finally { setSaving(false); } }
  async function status(i: Invoice, value: Invoice["status"]) { try { const r = await fetch("/api/invoices", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...i, status: value }) }); if (!r.ok) throw Error(); await refresh(); setPreview(null); } catch { setError("Le statut n’a pas pu être modifié."); } }
  async function remove(i: Invoice) { if (!confirm(`Supprimer la facture ${i.number} ?`)) return; try { const r = await fetch(`/api/invoices?id=${encodeURIComponent(i.id)}`, { method: "DELETE" }); if (!r.ok) throw Error(); await refresh(); setPreview(null); } catch { setError("Suppression impossible."); } }
  return <div className="app-shell">
<aside className="sidebar">
<div className="brand">
<Image src="/rd-logo.png" alt="RD Gestion & Services" width={185} height={37} priority/>
</div>
<div className="side-label">ESPACE DE TRAVAIL</div>
<div className="nav-active">
<FileText size={18}/> Factures</div>
<div className="side-bottom">Un espace clair pour vos factures, du brouillon au paiement.</div>
</aside>
<main className="main">
<header className="topbar">
<div className="mobile-brand">RD Gestion & Services</div>
<span>Votre espace de facturation <b>● Privé</b> <button className="logout" onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}>Déconnexion</button>
</span>
</header>
<div className="content">
<div className="heading">
<div>
<div className="eyebrow">GESTION COMMERCIALE</div>
<h1>Factures</h1>
<p>Créez, retrouvez et suivez vos factures au même endroit.</p>
</div>
<button className="primary" onClick={start}>
<Plus size={18}/> Nouvelle facture</button>
</div>
<div className="stats">
<div className="stat">
<span>Factures enregistrées</span>
<strong>{invoices.length}</strong>
<small>Dans votre espace</small>
</div>
<div className="stat">
<span>En attente de paiement</span>
<strong>{money(due)}</strong>
<small>{invoices.filter(i => i.status === "envoyée").length} facture(s) envoyée(s)</small>
</div>
<div className="stat">
<span>Montant encaissé</span>
<strong>{money(paid)}</strong>
<small>{invoices.filter(i => i.status === "payée").length} facture(s) payée(s)</small>
</div>
</div>
<section className="list-panel">
<div className="list-heading">
<div>
<h2>Toutes les factures</h2>
<p>Consultez vos documents et leur avancement.</p>
</div>
<div className="tools">
<label className="search">
<Search size={17}/>
<input aria-label="Rechercher une facture" placeholder="Client ou numéro..." value={query} onChange={e => setQuery(e.target.value)}/>
</label>
<select aria-label="Filtrer par statut" value={filter} onChange={e => setFilter(e.target.value)}>
<option value="toutes">Tous les statuts</option>
<option value="brouillon">Brouillons</option>
<option value="envoyée">Envoyées</option>
<option value="payée">Payées</option>
</select>
</div>
</div>{error && <div role="alert" className="error">{error}<button onClick={() => setError("")} aria-label="Fermer">
<X size={15}/>
</button>
</div>}{loading ? <div className="empty">Chargement de vos factures…</div> : shown.length === 0 ? <div className="empty">
<span className="empty-icon">
<FileText size={28}/>
</span>
<h3>{invoices.length ? "Aucune facture trouvée" : "Votre première facture commence ici"}</h3>
<p>{invoices.length ? "Essayez une autre recherche ou un autre statut." : "Ajoutez un client et vos prestations pour créer un document prêt à imprimer."}</p>{!invoices.length && <button className="outline" onClick={start}>
<Plus size={17}/> Créer une facture</button>}</div> : <div className="table-wrap">
<table>
<thead>
<tr>
<th>FACTURE</th>
<th>CLIENT</th>
<th>ÉMISE LE</th>
<th>ÉCHÉANCE</th>
<th>MONTANT TTC</th>
<th>STATUT</th>
<th>
</th>
</tr>
</thead>
<tbody>{shown.map(i => <tr key={i.id} onClick={() => setPreview(i)}>
<td className="number">{i.number}</td>
<td>{i.client}</td>
<td>{new Date(i.issueDate + "T12:00:00").toLocaleDateString("fr-FR")}</td>
<td>{new Date(i.dueDate + "T12:00:00").toLocaleDateString("fr-FR")}</td>
<td className="amount">{money(total(i), i.currency)}</td>
<td>
<span className={`badge ${i.status}`}>{i.status}</span>
</td>
<td className="row-arrow">›</td>
</tr>)}</tbody>
</table>
</div>}</section>
<footer>Les informations légales, taux et modalités de paiement sont à vérifier selon votre activité.</footer>
</div>
</main>
  <Dialog open={!!editor} onOpenChange={open => !open && setEditor(null)}>
<DialogContent className="editor-dialog">
<DialogHeader>
<DialogTitle>{editor?.id ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle>
</DialogHeader>{error && <div role="alert" className="error">{error}</div>}{editor && <div className="form-scroll">
<div className="form-grid">
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
<div className="form-grid">
<label>Nom ou raison sociale<input value={DEFAULT_ISSUER} readOnly/>
</label>
<label>Adresse<textarea value={DEFAULT_ISSUER_ADDRESS} readOnly/>
</label>
</div>
<label>E-mail de l’entreprise<input type="email" value={DEFAULT_ISSUER_EMAIL} readOnly/></label>
<label>Téléphone de l’entreprise<input value={DEFAULT_ISSUER_PHONE} readOnly/></label>
<h3>Client</h3>
<label>Choisir un client<select value={clientSelection} onChange={e => chooseClient(e.target.value)}>
{clientSelection === "__legacy__" && <option value="__legacy__">Client de cette facture (ancienne fiche)</option>}
<option value={NEW_CLIENT}>+ Ajouter un nouveau client</option>
{clients.map(client => <option key={client.id} value={client.id}>{clientName(client)}</option>)}
</select>
</label>
{clientSelection === NEW_CLIENT ? <div className="new-client-fields">
<div className="form-grid">
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
</div> : <div className="client-summary"><strong>{editor.client}</strong><span>{editor.clientAddress || "Adresse non renseignée"}</span><span>{editor.clientEmail || "E-mail non renseigné"}</span></div>}
<div className="form-grid">
<label>Suivi par<input value={editor.followedBy || ""} onChange={e => field("followedBy", e.target.value)} placeholder="Nom du contact"/>
</label>
<label>Objet<input value={editor.purpose || ""} onChange={e => field("purpose", e.target.value)} placeholder="Prestation de service"/>
</label>
</div>
<h3>Prestations</h3>{editor.lines.map((l, index) => <div className="line-form" key={index}>
<label>Période<input value={l.period || ""} onChange={e => line(index, "period", e.target.value)} placeholder="Période"/>
</label>
<label className="line-description">Description<input value={l.description} onChange={e => line(index, "description", e.target.value)} placeholder="Prestation ou produit"/>
</label>
<label>Qté<input type="number" min="0" step="any" value={l.quantity} onChange={e => line(index, "quantity", Number(e.target.value))}/>
</label>
<label>Prix HT<input type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => line(index, "unitPrice", Number(e.target.value))}/>
</label>
<label>Taxe %<input type="number" min="0" step="0.01" value={l.taxRate} onChange={e => line(index, "taxRate", Number(e.target.value))}/>
</label>
<button aria-label="Retirer la ligne" className="icon-button" disabled={editor.lines.length === 1} onClick={() => field("lines", editor.lines.filter((_, n) => n !== index))}>
<Trash2 size={17}/>
</button>
</div>)}<button className="text-button" onClick={() => field("lines", [...editor.lines, { description: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}>
<Plus size={16}/> Ajouter une ligne</button>
<label>Notes et modalités<textarea value={editor.notes} onChange={e => field("notes", e.target.value)} placeholder="Conditions de règlement, coordonnées bancaires..."/>
</label>
<div className="form-total">
<span>Total TTC</span>
<strong>{money(total(editor), editor.currency)}</strong>
</div>
<div className="form-actions">
<button className="outline" onClick={() => setEditor(null)}>Annuler</button>
<button className="primary" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer la facture"}</button>
</div>
</div>}</DialogContent>
</Dialog>
  <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}>
<DialogContent className="preview-dialog">
<DialogHeader>
<DialogTitle>Facture {preview?.number}</DialogTitle>
</DialogHeader>{preview && <>
<div className="preview-actions">
<button className="outline" onClick={() => editInvoice(preview)}>Modifier</button>{preview.status === "brouillon" && <button className="outline" onClick={() => status(preview, "envoyée")}>
<Send size={16}/> Marquer envoyée</button>}{preview.status === "envoyée" && <button className="outline" onClick={() => status(preview, "payée")}>
<Check size={16}/> Marquer payée</button>}<button className="outline" onClick={() => window.print()}>
<Printer size={16}/> Imprimer / PDF</button>
<button className="icon-button danger" aria-label="Supprimer" onClick={() => remove(preview)}>
<Trash2 size={17}/>
</button>
</div>
<div className="invoice-paper">
<div className="paper-top">
<div className="paper-branding">
<Image src="/rd-logo.png" alt="RD Gestion & Services" width={240} height={47} className="paper-logo"/>
</div>
<div className="paper-issuer">
<strong>{preview.issuer}</strong>
<p>{preview.issuerAddress}</p>
<p>{preview.issuerDetails}</p>
</div>
</div>
<h2 className="paper-title">FACTURE N° {preview.number}</h2>
<div className="paper-parties">
<div className="paper-context">
<span>Émise le : {new Date(preview.issueDate + "T12:00:00").toLocaleDateString("fr-FR")}</span>
<span>SUIVI PAR : {preview.followedBy || "—"}</span>
<span>POUR : {preview.purpose || "PRESTATION DE SERVICE"}</span>
</div>
<div className="paper-client">
<strong>{preview.client}</strong>
<p>{preview.clientAddress}</p>
<p>{preview.clientEmail}</p>
</div>
</div>
<table className="paper-table">
<thead>
<tr>
<th>Période</th>
<th>Description</th>
<th>Prix unitaire</th>
<th>Total</th>
</tr>
</thead>
<tbody>{preview.lines.map((l, n) => <tr key={n}>
<td>{l.period || "—"}</td>
<td>{l.description}</td>
<td>{money(l.unitPrice, preview.currency)}{l.quantity !== 1 ? ` × ${l.quantity}` : ""}</td>
<td>{money(l.quantity * l.unitPrice * (1 + l.taxRate / 100), preview.currency)}</td>
</tr>)}</tbody>
</table>
<div className="paper-summary">
<div className="bank-details">
<strong>Coordonnées bancaires</strong>
<p>{preview.bankDetails || DEFAULT_BANK_DETAILS}</p>
</div>
<div className="paper-totals">
<div>
<span>Sous-total HT</span>
<strong>{money(base(preview), preview.currency)}</strong>
</div>
<div>
<span>Total TVA</span>
<strong>{money(total(preview) - base(preview), preview.currency)}</strong>
</div>
<div>
<span>Autres coûts</span>
<strong>{money(0, preview.currency)}</strong>
</div>
<div className="grand-total">
<span>Total TTC</span>
<strong>{money(total(preview), preview.currency)}</strong>
</div>
<div className="payment-due">
<span>Échéance paiement</span>
<strong>{new Date(preview.dueDate + "T12:00:00").toLocaleDateString("fr-FR")}</strong>
</div>
</div>
</div>
<div className="paper-notes">
<p>{preview.notes || DEFAULT_LEGAL_MENTIONS}</p>
</div>
<div className="paper-footer">{DEFAULT_INVOICE_FOOTER}</div>
</div>
</>}</DialogContent>
</Dialog>
</div>;
}
