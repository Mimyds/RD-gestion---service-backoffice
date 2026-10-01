"use client";
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import { Check, Download, FileText, LoaderCircle, Plus, Printer, Search, Send, Trash2 } from "lucide-react";
import type { ClientRecord } from "@/components/client-manager";
import { InvoiceEditor } from "@/components/invoice-editor";
import { InvoicePaper } from "@/components/invoice-paper";
import { ScaledPage } from "@/components/scaled-page";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fileName, formatDate } from "@/lib/dates";
import type { CompanySettings } from "@/lib/company";
import { blankInvoice, type Invoice, money, nextInvoiceNumber, total, withCurrentCompany } from "@/lib/invoices";
import { downloadPdf, invoicePdf, printPdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";

const tw = {
  heading: "mb-8 flex items-end justify-between gap-5 max-[700px]:flex-col max-[700px]:items-stretch",
  eyebrow: "mb-2 text-xs font-bold tracking-[0.15em] text-ring",
  headingTitle: "mb-3 text-5xl leading-none font-medium tracking-[-0.045em] max-[700px]:text-[39px]",
  headingText: "m-0 leading-6 text-muted-foreground",
  primary: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 py-2.5 font-semibold whitespace-nowrap text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-semibold whitespace-nowrap text-foreground hover:bg-accent",
  stats: "mb-7 grid grid-cols-3 gap-4 max-[700px]:grid-cols-1 max-[700px]:gap-2.5",
  stat: "min-h-36 rounded-xl border bg-card px-6 py-5 shadow-sm max-[700px]:min-h-0 max-[700px]:p-4",
  statValue: "my-4 block text-[32px] font-medium tracking-tight max-[700px]:my-2 max-[700px]:text-[27px]",
  listPanel: "min-h-90 rounded-xl border bg-card shadow-sm",
  listHeading: "flex items-center justify-between gap-5 border-b px-7 py-6 max-[1050px]:flex-col max-[1050px]:items-stretch max-[700px]:p-5",
  tools: "flex gap-2 max-[1050px]:w-full max-[700px]:flex-col",
  search: "flex w-64 items-center gap-2 rounded-lg border px-3 text-muted-foreground max-[1050px]:flex-1 max-[700px]:min-h-10 max-[700px]:w-full [&_input]:w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
  empty: "px-5 py-14 text-center text-muted-foreground",
  emptyIcon: "mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-accent text-ring",
  iconButton: "inline-grid place-items-center border-0 bg-transparent p-2.5 text-muted-foreground",
  editorDialog: "max-h-[92vh] w-[min(92vw,860px)] max-w-[860px] overflow-auto p-6 max-[700px]:w-[98vw] max-[700px]:p-4",
  previewDialog: "grid h-[94vh] w-[min(96vw,1120px)] max-w-[1120px] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[1120px] max-[700px]:h-[96dvh] max-[700px]:w-[calc(100vw-1rem)]",
  previewScroll: "min-h-0 overflow-auto bg-muted/40 p-6 max-[700px]:p-3",
} as const;

type ModelContext = { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> };

export function InvoiceManager({ clients, company, error, onError, onClientsChanged }: {
  clients: ClientRecord[];
  company: CompanySettings;
  error: string;
  onError: (message: string) => void;
  onClientsChanged: () => Promise<void>;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]), [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Invoice | null>(null), [preview, setPreview] = useState<Invoice | null>(null);
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("toutes");
  const [exportingPdf, setExportingPdf] = useState(false), [printing, setPrinting] = useState(false);

  const refresh = useCallback(async () => { try { const response = await fetch("/api/invoices"); const data = await response.json(); if (!response.ok) throw Error(data.error); setInvoices(data.invoices); } catch { onError("Impossible de charger vos factures. Réessayez dans un instant."); } finally { setLoading(false); } }, [onError]);
  useEffect(() => { void refresh(); }, [refresh]);

  function start() { onError(""); setEditor({ ...blankInvoice(company), number: nextInvoiceNumber(invoices) }); }
  const startFromAssistant = useEffectEvent(start);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({ name: "start_invoice_creation", title: "Nouvelle facture", description: "Ouvre le formulaire de création d'une facture dans l'interface.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { startFromAssistant(); return { opened: true }; } }, { signal: lifecycle.signal })).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    });
    return () => lifecycle.abort();
  }, []);

  const shown = useMemo(() => invoices.filter(i => (filter === "toutes" || i.status === filter) && `${i.number} ${i.client}`.toLowerCase().includes(query.toLowerCase())), [invoices, filter, query]);
  const sentInvoices = invoices.filter(i => i.status === "envoyée"), paidInvoices = invoices.filter(i => i.status === "payée");
  const due = sentInvoices.reduce((s, i) => s + total(i), 0), paid = paidInvoices.reduce((s, i) => s + total(i), 0);

  function editInvoice(invoice: Invoice) { onError(""); setEditor(withCurrentCompany(invoice, company)); setPreview(null); }
  async function saved() { setEditor(null); await Promise.all([refresh(), onClientsChanged()]); }
  async function status(i: Invoice, value: Invoice["status"]) { try { const r = await fetch("/api/invoices", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...i, status: value }) }); if (!r.ok) throw Error(); await refresh(); setPreview(null); } catch { onError("Le statut n’a pas pu être modifié."); } }
  async function remove(i: Invoice) { if (!confirm(`Supprimer la facture ${i.number} ?`)) return; try { const r = await fetch(`/api/invoices?id=${encodeURIComponent(i.id)}`, { method: "DELETE" }); if (!r.ok) throw Error(); await refresh(); setPreview(null); } catch { onError("Suppression impossible."); } }
  async function printInvoice() {
    if (!preview) return;
    const invoice = withCurrentCompany(preview, company);
    setPrinting(true);
    onError("");
    try {
      await printPdf(() => invoicePdf(invoice));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Impression impossible.");
    } finally {
      setPrinting(false);
    }
  }
  async function downloadInvoicePdf() {
    if (!preview) return;
    setExportingPdf(true);
    onError("");
    try {
      await downloadPdf(() => invoicePdf(withCurrentCompany(preview, company)), fileName(`facture-${preview.number}`, "facture"));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Enregistrement du PDF impossible.");
    } finally {
      setExportingPdf(false);
    }
  }

  return <>
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
<strong className={tw.statValue}>{invoices.length}</strong>
<small className="block text-[13px] text-muted-foreground">Dans votre espace</small>
</div>
<div className={tw.stat}>
<span className="block text-sm font-semibold text-muted-foreground">En attente de paiement</span>
<strong className={tw.statValue}>{money(due)}</strong>
<small className="block text-[13px] text-muted-foreground">{sentInvoices.length} facture(s) envoyée(s)</small>
</div>
<div className={tw.stat}>
<span className="block text-sm font-semibold text-muted-foreground">Montant encaissé</span>
<strong className={tw.statValue}>{money(paid)}</strong>
<small className="block text-[13px] text-muted-foreground">{paidInvoices.length} facture(s) payée(s)</small>
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
</div>{loading ? <div className={tw.empty}>Chargement de vos factures…</div> : shown.length === 0 ? <div className={tw.empty}>
<span className={tw.emptyIcon}>
<FileText size={28}/>
</span>
<h3 className="mb-2 text-lg font-semibold text-foreground">{invoices.length ? "Aucune facture trouvée" : "Votre première facture commence ici"}</h3>
<p className="mx-auto mb-5 max-w-96 text-sm leading-6">{invoices.length ? "Essayez une autre recherche ou un autre statut." : "Ajoutez un client et vos prestations pour créer un document prêt à imprimer."}</p>{!invoices.length && <button className={tw.outline} onClick={start}>
<Plus size={17}/> Créer une facture</button>}</div> : <div className="overflow-auto">
<table className="w-full border-collapse text-left">
<thead>
<tr className="bg-muted/40 text-[11px] tracking-wider text-muted-foreground [&_th]:px-5 [&_th]:py-4">
<th>FACTURE</th><th>CLIENT</th><th>ÉMISE LE</th><th>ÉCHÉANCE</th><th>MONTANT TTC</th><th>STATUT</th><th>
</th>
</tr>
</thead>
<tbody>{shown.map(i => <tr className="cursor-pointer hover:bg-muted/30 [&_td]:border-t [&_td]:px-5 [&_td]:py-5 [&_td]:text-sm [&_td]:text-muted-foreground" key={i.id} onClick={() => setPreview(i)}>
<td className="font-bold text-foreground!">{i.number}</td>
<td>{i.client}</td><td>{formatDate(i.issueDate)}</td><td>{formatDate(i.dueDate)}</td>
<td className="font-bold text-foreground!">{money(total(i), i.currency)}</td>
<td>
<span className={cn("inline-block rounded-full px-2.5 py-1.5 text-xs font-bold capitalize", i.status === "brouillon" && "bg-muted text-muted-foreground", i.status === "envoyée" && "bg-amber-100 text-amber-700", i.status === "payée" && "bg-emerald-100 text-emerald-700")}>{i.status}</span>
</td>
<td className="text-2xl text-muted-foreground">›</td>
</tr>)}</tbody>
</table>
</div>}</section>
<footer className="my-6 text-xs text-muted-foreground">Les informations légales, taux et modalités de paiement sont à vérifier selon votre activité.</footer>
  <Dialog open={!!editor} onOpenChange={open => !open && setEditor(null)}>
<DialogContent className={tw.editorDialog}>
<DialogHeader>
<DialogTitle>{editor?.id ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle>
</DialogHeader>{editor && <InvoiceEditor key={editor.id || editor.number} initial={editor} clients={clients} error={error} onError={onError} onCancel={() => setEditor(null)} onSaved={saved}/>}</DialogContent>
  </Dialog>
  <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}>
<DialogContent className={tw.previewDialog}>
<DialogHeader className="px-6 pt-6 pr-14 pb-3 max-[700px]:px-4 max-[700px]:pt-4 max-[700px]:pr-12">
<DialogTitle>Facture {preview?.number}</DialogTitle>
</DialogHeader>{preview && <>
<div className="flex flex-wrap gap-2 px-6 pb-4 print:hidden max-[700px]:px-4">
<button className={tw.outline} onClick={() => editInvoice(preview)}>Modifier</button>{preview.status === "brouillon" && <button className={tw.outline} onClick={() => status(preview, "envoyée")}>
<Send size={16}/> Marquer envoyée</button>}{preview.status === "envoyée" && <button className={tw.outline} onClick={() => status(preview, "payée")}>
<Check size={16}/> Marquer payée</button>}<button className={tw.outline} disabled={printing} onClick={printInvoice}>
{printing ? <LoaderCircle className="animate-spin" size={16}/> : <Printer size={16}/>} {printing ? "Préparation…" : "Imprimer"}</button>
<button className={tw.outline} disabled={exportingPdf} onClick={downloadInvoicePdf}>
{exportingPdf ? <LoaderCircle className="animate-spin" size={16}/> : <Download size={16}/>} {exportingPdf ? "Création du PDF…" : "Enregistrer en PDF"}</button>
<button className={cn(tw.iconButton, "text-destructive")} aria-label="Supprimer" onClick={() => remove(preview)}>
<Trash2 size={17}/>
</button>
</div>
<div className={tw.previewScroll}>
<ScaledPage><InvoicePaper invoice={withCurrentCompany(preview, company)}/></ScaledPage>
</div>
</>}</DialogContent>
</Dialog>
  </>;
}
