"use client";
import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, Printer, Trash2, Check, Send, X, UsersRound } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/date-picker";
import { ClientManager, type ClientRecord } from "@/components/client-manager";
import { cn } from "@/lib/utils";

type Line = { period?: string; description: string; quantity: number; unitPrice: number; taxRate: number };
type Invoice = { id: string; clientId?: string | null; number: string; client: string; clientAddress: string; clientEmail: string; issueDate: string; dueDate: string; status: "brouillon" | "envoyée" | "payée"; lines: Line[]; notes: string; followedBy?: string; purpose?: string; bankDetails?: string; issuer: string; issuerAddress: string; issuerDetails: string; currency: string };
type Client = ClientRecord;
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
const tw = {
  appShell: "flex min-h-screen",
  sidebar: "flex w-[238px] shrink-0 flex-col bg-[#17364b] px-5 py-7 text-white max-[1050px]:w-[190px] max-[700px]:hidden print:hidden",
  brand: "flex items-center whitespace-nowrap px-2 text-xl font-bold tracking-[-0.05em] [&_img]:h-auto [&_img]:w-[185px] [&_img]:rounded-md [&_img]:bg-white [&_img]:p-1",
  sideLabel: "mx-3 mt-16 mb-4 text-xs font-bold tracking-[0.1em] text-[#88aab4]",
  sideBottom: "mt-auto border-t border-[#345569] px-3 py-5 text-sm leading-6 text-[#a7c1c9]",
  main: "min-w-0 flex-1",
  topbar: "flex h-[75px] items-center justify-end border-b bg-card px-[4.5%] text-sm text-muted-foreground max-[700px]:h-[62px] max-[700px]:justify-between",
  mobileBrand: "hidden font-extrabold tracking-tight text-foreground max-[700px]:block",
  content: "mx-auto max-w-[1320px] px-[4.5%] py-11 max-[1050px]:px-[3%] max-[700px]:px-4 max-[700px]:py-7",
  heading: "mb-8 flex items-end justify-between gap-5 max-[700px]:flex-col max-[700px]:items-stretch",
  eyebrow: "mb-2 text-xs font-bold tracking-[0.15em] text-ring",
  headingTitle: "mb-3 text-5xl leading-none font-medium tracking-[-0.045em] max-[700px]:text-[39px]",
  headingText: "m-0 leading-6 text-muted-foreground",
  primary: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 py-2.5 font-semibold whitespace-nowrap text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-semibold whitespace-nowrap text-foreground hover:bg-accent",
  stats: "mb-7 grid grid-cols-3 gap-4 max-[700px]:grid-cols-1 max-[700px]:gap-2.5",
  stat: "min-h-36 rounded-xl border bg-card px-6 py-5 shadow-sm max-[700px]:min-h-0 max-[700px]:p-4",
  listPanel: "min-h-90 rounded-xl border bg-card shadow-sm",
  listHeading: "flex items-center justify-between gap-5 border-b px-7 py-6 max-[1050px]:flex-col max-[1050px]:items-stretch max-[700px]:p-5",
  tools: "flex gap-2 max-[1050px]:w-full max-[700px]:flex-col",
  search: "flex w-64 items-center gap-2 rounded-lg border px-3 text-muted-foreground max-[1050px]:flex-1 max-[700px]:min-h-10 max-[700px]:w-full [&_input]:w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
  empty: "px-5 py-14 text-center text-muted-foreground",
  emptyIcon: "mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-accent text-ring",
  tableWrap: "overflow-auto",
  error: "flex justify-between bg-destructive/10 px-4 py-3 text-sm text-destructive [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-inherit",
  editorDialog: "max-h-[92vh] w-[min(92vw,860px)] max-w-[860px] overflow-auto p-6 max-[700px]:w-[98vw] max-[700px]:p-4",
  formScroll: "overflow-auto px-0.5 [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:border-t [&_h3]:pt-3 [&_h3]:text-sm [&_label]:mb-3 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-muted-foreground [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-[15px] [&_input]:text-foreground [&_input]:outline-ring [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-[15px] [&_select]:text-foreground [&_textarea]:min-w-0 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-[15px] [&_textarea]:text-foreground",
  formGrid: "grid grid-cols-2 gap-3 max-[700px]:grid-cols-1",
  lineForm: "grid grid-cols-[minmax(90px,1fr)_minmax(160px,2fr)_repeat(3,minmax(75px,1fr))_36px] items-end gap-2.5 max-[700px]:grid-cols-2",
  iconButton: "inline-grid place-items-center border-0 bg-transparent p-2.5 text-muted-foreground",
  textButton: "flex items-center gap-1.5 border-0 bg-transparent px-0 pt-1 pb-4 text-sm font-semibold text-ring",
  formTotal: "flex justify-end gap-10 border-t py-4 text-lg",
  formActions: "flex justify-end gap-2.5",
  invoicePaper: "relative flex min-h-[1040px] flex-col border bg-white px-12 pt-14 pb-8 font-sans text-[#0d4d75] shadow-lg print:min-h-[250mm] print:border-0 print:px-[6mm] print:pt-[8mm] print:pb-[5mm] print:shadow-none max-[700px]:min-h-0 max-[700px]:p-6",
} as const;

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editor, setEditor] = useState<Invoice | null>(null), [preview, setPreview] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]), [clientSelection, setClientSelection] = useState(NEW_CLIENT), [clientDraft, setClientDraft] = useState<ClientDraft>(blankClient);
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("toutes"), [saving, setSaving] = useState(false);
  const [view, setView] = useState<"invoices" | "clients">("invoices");
  const [profile, setProfile] = useState({ issuer: DEFAULT_ISSUER, issuerAddress: DEFAULT_ISSUER_ADDRESS, issuerDetails: DEFAULT_ISSUER_DETAILS });
  async function refresh() { try { const [invoiceResponse, clientResponse] = await Promise.all([fetch("/api/invoices"), fetch("/api/clients")]); if (!invoiceResponse.ok || !clientResponse.ok) throw Error(); const [invoiceData, clientData] = await Promise.all([invoiceResponse.json(), clientResponse.json()]); setInvoices(invoiceData.invoices); setClients(clientData.clients); setProfile({ issuer: DEFAULT_ISSUER, issuerAddress: DEFAULT_ISSUER_ADDRESS, issuerDetails: DEFAULT_ISSUER_DETAILS }); setError(""); } catch { setError("Impossible de charger vos factures et clients. Réessayez dans un instant."); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({ name: "start_invoice_creation", title: "Nouvelle facture", description: "Ouvre le formulaire de création d'une facture dans l'interface.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { start(); return { opened: true }; } }, { signal: lifecycle.signal })).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    });
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
  return <div className={tw.appShell}>
<aside className={tw.sidebar}>
<div className={tw.brand}>
<Image src="/rd-logo.png" alt="RD Gestion & Services" width={185} height={37} priority/>
</div>
<div className={tw.sideLabel}>ESPACE DE TRAVAIL</div>
<button aria-current={view === "invoices" ? "page" : undefined} className={cn("flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3.5 py-3.5 text-left font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-[18px]", view === "invoices" && "bg-white/10 text-white")} onClick={() => setView("invoices")}>
<FileText/> Factures</button>
<button aria-current={view === "clients" ? "page" : undefined} className={cn("mt-1.5 flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3.5 py-3.5 text-left font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-[18px]", view === "clients" && "bg-white/10 text-white")} onClick={() => setView("clients")}>
<UsersRound/> Clients</button>
<div className={tw.sideBottom}>Un espace clair pour vos factures, du brouillon au paiement.</div>
</aside>
<main className={tw.main}>
<header className={tw.topbar}>
<div className={tw.mobileBrand}>RD Gestion & Services</div>
<span className="max-[700px]:text-xs">Votre espace de facturation <b className="ml-4 font-semibold text-ring max-[700px]:ml-1">● Privé</b> <button className="ml-4 border-0 bg-transparent text-[13px] text-foreground underline" onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}>Déconnexion</button>
</span>
</header>
<div className={tw.content}>
{view === "clients" ? <ClientManager clients={clients} loading={loading} onChanged={refresh} onError={setError}/> : <>
<div className={tw.heading}>
<div>
<div className={tw.eyebrow}>GESTION COMMERCIALE</div>
<h1 className={tw.headingTitle}>Factures</h1>
<p className={tw.headingText}>Créez, retrouvez et suivez vos factures au même endroit.</p>
</div>
<button className={tw.primary} onClick={start}>
<Plus size={18}/> Nouvelle facture</button>
</div>
<div className={tw.stats}>
<div className={tw.stat}>
<span className="block text-sm font-semibold text-muted-foreground">Factures enregistrées</span>
<strong className="my-4 block text-[32px] font-medium tracking-tight max-[700px]:my-2 max-[700px]:text-[27px]">{invoices.length}</strong>
<small className="block text-[13px] text-muted-foreground">Dans votre espace</small>
</div>
<div className={tw.stat}>
<span className="block text-sm font-semibold text-muted-foreground">En attente de paiement</span>
<strong className="my-4 block text-[32px] font-medium tracking-tight max-[700px]:my-2 max-[700px]:text-[27px]">{money(due)}</strong>
<small className="block text-[13px] text-muted-foreground">{invoices.filter(i => i.status === "envoyée").length} facture(s) envoyée(s)</small>
</div>
<div className={tw.stat}>
<span className="block text-sm font-semibold text-muted-foreground">Montant encaissé</span>
<strong className="my-4 block text-[32px] font-medium tracking-tight max-[700px]:my-2 max-[700px]:text-[27px]">{money(paid)}</strong>
<small className="block text-[13px] text-muted-foreground">{invoices.filter(i => i.status === "payée").length} facture(s) payée(s)</small>
</div>
</div>
<section className={tw.listPanel}>
<div className={tw.listHeading}>
<div>
<h2 className="mb-1 text-lg font-semibold">Toutes les factures</h2>
<p className="m-0 text-sm leading-6 text-muted-foreground">Consultez vos documents et leur avancement.</p>
</div>
<div className={tw.tools}>
<label className={tw.search}>
<Search size={17}/>
<input aria-label="Rechercher une facture" placeholder="Client ou numéro..." value={query} onChange={e => setQuery(e.target.value)}/>
</label>
<select className="rounded-lg border bg-background px-2.5 py-2 text-sm text-foreground" aria-label="Filtrer par statut" value={filter} onChange={e => setFilter(e.target.value)}>
<option value="toutes">Tous les statuts</option>
<option value="brouillon">Brouillons</option>
<option value="envoyée">Envoyées</option>
<option value="payée">Payées</option>
</select>
</div>
</div>{error && <div role="alert" className={tw.error}>{error}<button onClick={() => setError("")} aria-label="Fermer">
<X size={15}/>
</button>
</div>}{loading ? <div className={tw.empty}>Chargement de vos factures…</div> : shown.length === 0 ? <div className={tw.empty}>
<span className={tw.emptyIcon}>
<FileText size={28}/>
</span>
<h3 className="mb-2 text-lg font-semibold text-foreground">{invoices.length ? "Aucune facture trouvée" : "Votre première facture commence ici"}</h3>
<p className="mx-auto mb-5 max-w-96 text-sm leading-6">{invoices.length ? "Essayez une autre recherche ou un autre statut." : "Ajoutez un client et vos prestations pour créer un document prêt à imprimer."}</p>{!invoices.length && <button className={tw.outline} onClick={start}>
<Plus size={17}/> Créer une facture</button>}</div> : <div className={tw.tableWrap}>
<table className="w-full border-collapse text-left">
<thead>
<tr className="bg-muted/40 text-[11px] tracking-wider text-muted-foreground [&_th]:px-5 [&_th]:py-4">
<th>FACTURE</th><th>CLIENT</th><th>ÉMISE LE</th><th>ÉCHÉANCE</th><th>MONTANT TTC</th><th>STATUT</th><th>
</th>
</tr>
</thead>
<tbody>{shown.map(i => <tr className="cursor-pointer hover:bg-muted/30 [&_td]:border-t [&_td]:px-5 [&_td]:py-5 [&_td]:text-sm [&_td]:text-muted-foreground" key={i.id} onClick={() => setPreview(i)}>
<td className="font-bold text-foreground!">{i.number}</td>
<td>{i.client}</td><td>{new Date(i.issueDate + "T12:00:00").toLocaleDateString("fr-FR")}</td><td>{new Date(i.dueDate + "T12:00:00").toLocaleDateString("fr-FR")}</td>
<td className="font-bold text-foreground!">{money(total(i), i.currency)}</td>
<td>
<span className={cn("inline-block rounded-full px-2.5 py-1.5 text-xs font-bold capitalize", i.status === "brouillon" && "bg-muted text-muted-foreground", i.status === "envoyée" && "bg-amber-100 text-amber-700", i.status === "payée" && "bg-emerald-100 text-emerald-700")}>{i.status}</span>
</td>
<td className="text-2xl text-muted-foreground">›</td>
</tr>)}</tbody>
</table>
</div>}</section>
<footer className="my-6 text-xs text-muted-foreground">Les informations légales, taux et modalités de paiement sont à vérifier selon votre activité.</footer>
</>}
</div>
</main>
  <Dialog open={!!editor} onOpenChange={open => !open && setEditor(null)}>
<DialogContent className={tw.editorDialog}>
<DialogHeader>
<DialogTitle>{editor?.id ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle>
</DialogHeader>{error && <div role="alert" className={tw.error}>{error}</div>}{editor && <div className={tw.formScroll}>
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
<button aria-label="Retirer la ligne" className={tw.iconButton} disabled={editor.lines.length === 1} onClick={() => field("lines", editor.lines.filter((_, n) => n !== index))}>
<Trash2 size={17}/>
</button>
</div>)}<button className={tw.textButton} onClick={() => field("lines", [...editor.lines, { description: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}>
<Plus size={16}/> Ajouter une ligne</button>
<label>Notes et modalités<textarea value={editor.notes} onChange={e => field("notes", e.target.value)} placeholder="Conditions de règlement, coordonnées bancaires..."/>
</label>
<div className={tw.formTotal}>
<span>Total TTC</span>
<strong>{money(total(editor), editor.currency)}</strong>
</div>
<div className={tw.formActions}>
<button className={tw.outline} onClick={() => setEditor(null)}>Annuler</button>
<button className={tw.primary} disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer la facture"}</button>
</div>
</div>}</DialogContent>
</Dialog>
  <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}>
<DialogContent className={tw.editorDialog}>
<DialogHeader>
<DialogTitle>Facture {preview?.number}</DialogTitle>
</DialogHeader>{preview && <>
<div className="my-3 flex flex-wrap gap-2 print:hidden">
<button className={tw.outline} onClick={() => editInvoice(preview)}>Modifier</button>{preview.status === "brouillon" && <button className={tw.outline} onClick={() => status(preview, "envoyée")}>
<Send size={16}/> Marquer envoyée</button>}{preview.status === "envoyée" && <button className={tw.outline} onClick={() => status(preview, "payée")}>
<Check size={16}/> Marquer payée</button>}<button className={tw.outline} onClick={() => window.print()}>
<Printer size={16}/> Imprimer / PDF</button>
<button className={cn(tw.iconButton, "text-destructive")} aria-label="Supprimer" onClick={() => remove(preview)}>
<Trash2 size={17}/>
</button>
</div>
<div className={tw.invoicePaper}>
<div className="flex items-start justify-between gap-6 max-[700px]:flex-col">
<div className="w-[48%] max-[700px]:w-full">
<Image src="/rd-logo.png" alt="RD Gestion & Services" width={240} height={47} className="m-0 h-auto w-[285px] max-w-full"/>
</div>
<div className="w-[42%] text-[#202945] max-[700px]:w-full [&_p]:my-1 [&_p]:whitespace-pre-line [&_p]:text-xs [&_p]:font-semibold [&_p]:leading-[1.35] [&_strong]:mb-1.5 [&_strong]:block [&_strong]:text-[13px] [&_strong]:uppercase">
<strong>{preview.issuer}</strong>
<p>{preview.issuerAddress}</p>
<p>{preview.issuerDetails}</p>
</div>
</div>
<h2 className="my-9 mt-20 text-[28px] font-normal tracking-[0.01em] max-[700px]:my-7 max-[700px]:mt-10">FACTURE N° {preview.number}</h2>
<div className="mb-12 grid grid-cols-[1fr_44%] items-start gap-10 max-[700px]:grid-cols-1">
<div className="m-0 grid gap-4 text-[13px] uppercase">
<span>Émise le : {new Date(preview.issueDate + "T12:00:00").toLocaleDateString("fr-FR")}</span>
<span>SUIVI PAR : {preview.followedBy || "—"}</span>
<span>POUR : {preview.purpose || "PRESTATION DE SERVICE"}</span>
</div>
<div className="m-0 uppercase [&_p]:my-1 [&_p]:whitespace-pre-line [&_p]:text-[13px] [&_strong]:text-[13px] [&_strong]:font-normal">
<strong>{preview.client}</strong>
<p>{preview.clientAddress}</p>
<p>{preview.clientEmail}</p>
</div>
</div>
<table className="w-full table-fixed border-collapse text-left max-[700px]:block max-[700px]:overflow-x-auto [&_th]:border [&_th]:border-black [&_th]:bg-[#0c4d74] [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-center [&_th]:text-xs [&_th]:font-normal [&_th]:text-white [&_th]:uppercase [&_td]:h-20 [&_td]:border [&_td]:border-[#d2d2d2] [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-xs [&_td]:leading-[1.35] [&_td]:align-top">
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
<div className="mt-4 grid grid-cols-[41%_59%] items-start max-[700px]:grid-cols-1 max-[700px]:gap-4">
<div className="m-0 px-2 pt-2 pr-3.5 text-[11px] text-[#315d79] [&_p]:whitespace-pre-line [&_p]:text-[11px] [&_p]:leading-[1.45] [&_strong]:uppercase">
<strong>Coordonnées bancaires</strong>
<p>{preview.bankDetails || DEFAULT_BANK_DETAILS}</p>
</div>
<div className="m-0 w-full [&>div]:flex [&>div]:min-h-8 [&>div]:justify-between [&>div]:border [&>div]:border-b-0 [&>div]:border-[#d2d2d2] [&>div]:px-2.5 [&>div]:py-2 [&>div]:text-xs [&>div]:uppercase [&>div:last-child]:border-b">
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
<div className="text-sm! text-[#e9853e] [&_strong]:text-[#0d4d75]">
<span>Total TTC</span>
<strong>{money(total(preview), preview.currency)}</strong>
</div>
<div className="text-[11px]!">
<span>Échéance paiement</span>
<strong>{new Date(preview.dueDate + "T12:00:00").toLocaleDateString("fr-FR")}</strong>
</div>
</div>
</div>
<div className="my-14 border-0 p-0 max-[700px]:my-9">
<p className="text-[11px] leading-[1.4] whitespace-pre-line">{preview.notes || DEFAULT_LEGAL_MENTIONS}</p>
</div>
<div className="mt-auto border-t border-[#6d9ab6] pt-2 text-center text-[9px] leading-[1.35] uppercase max-[700px]:mt-7">{DEFAULT_INVOICE_FOOTER}</div>
</div>
</>}</DialogContent>
</Dialog>
</div>;
}
