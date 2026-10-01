"use client";

import type { JSONContent } from "@tiptap/core";
import { Download, Eye, LoaderCircle, Mail, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientRecord } from "@/components/client-manager";
import { DatePicker } from "@/components/date-picker";
import { ErrorBanner } from "@/components/error-banner";
import { LetterEditor } from "@/components/letter-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientAddress, clientName } from "@/lib/clients";
import { COMPANY_DETAILS, COMPANY_LETTER_CITY, COMPANY_POSTAL_CITY, COMPANY_STREET } from "@/lib/company";
import { fileName, formatDate, localDate } from "@/lib/dates";
import { downloadElementAsPdf } from "@/lib/download-pdf";
import { printDocument } from "@/lib/print-document";

type LetterStatus = "brouillon" | "finalisé" | "envoyé" | "archivé";

type Letter = {
  id: string;
  clientId: string | null;
  subject: string;
  status: LetterStatus;
  recipient: string;
  recipientAddress: string;
  reference: string;
  date: string;
  content: JSONContent;
  createdAt?: string;
  updatedAt?: string;
};

const emptyContent: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const emptyLetter = (): Letter => ({
  id: "",
  clientId: null,
  subject: "",
  status: "brouillon",
  recipient: "",
  recipientAddress: "",
  reference: "",
  date: localDate(),
  content: emptyContent,
});

const statusStyle: Record<LetterStatus, string> = {
  brouillon: "bg-amber-100 text-amber-800",
  finalisé: "bg-blue-100 text-blue-800",
  envoyé: "bg-emerald-100 text-emerald-800",
  archivé: "bg-slate-100 text-slate-700",
};

const safeHref = (href: unknown) => typeof href === "string" && /^(https?:|mailto:|tel:)/i.test(href.trim()) ? href.trim() : undefined;

function richTextNode(node: JSONContent, key: string): ReactNode {
  if (node.type === "text") {
    let value: ReactNode = node.text || "";
    for (const [index, mark] of (node.marks || []).entries()) {
      const markKey = `${key}-mark-${index}`;
      if (mark.type === "bold") value = <strong key={markKey}>{value}</strong>;
      if (mark.type === "italic") value = <em key={markKey}>{value}</em>;
      if (mark.type === "strike") value = <s key={markKey}>{value}</s>;
      if (mark.type === "underline") value = <u key={markKey}>{value}</u>;
      if (mark.type === "code") value = <code key={markKey} className="rounded bg-slate-100 px-1 font-mono text-[0.9em]">{value}</code>;
      if (mark.type === "link") value = <a key={markKey} href={safeHref(mark.attrs?.href)} className="text-[#0d4d75] underline">{value}</a>;
    }
    return value;
  }
  if (node.type === "hardBreak") return <br key={key}/>;
  if (node.type === "horizontalRule") return <hr key={key} className="my-6 border-[#cbd5e1]"/>;

  const children = (node.content || []).map((child, index) => richTextNode(child, `${key}-${index}`));
  if (node.type === "doc") return <>{children}</>;
  if (node.type === "heading") return <h2 key={key} className="my-5 text-xl font-semibold">{children}</h2>;
  if (node.type === "bulletList") return <ul key={key} className="my-4 list-disc space-y-1 pl-7">{children}</ul>;
  if (node.type === "orderedList") return <ol key={key} className="my-4 list-decimal space-y-1 pl-7">{children}</ol>;
  if (node.type === "listItem") return <li key={key}>{children}</li>;
  if (node.type === "codeBlock") return <pre key={key} className="my-4 rounded bg-slate-100 p-3 font-mono text-sm whitespace-pre-wrap">{children}</pre>;
  if (node.type === "blockquote") return <blockquote key={key} className="my-4 border-l-4 border-[#cbd5e1] pl-4 italic">{children}</blockquote>;
  return <p key={key} className="my-4 min-h-[1.5em]">{children}</p>;
}

function LetterPaper({ letter }: { letter: Letter }) {
  return <article className="letter-print-root mx-auto min-h-[1123px] w-[794px] bg-white px-[76px] py-[72px] font-sans text-[15px] leading-7 text-[#0f172a] shadow-xl">
    <header className="mb-14 flex items-start justify-between gap-10">
      <div>
        <Image src="/logo-web.svg" alt="RD Gestion & Services" width={225} height={44} priority className="mb-4" style={{ width: "225px", height: "auto" }}/>
        <p className="text-xs leading-5 whitespace-pre-line text-[#475569]">{`${COMPANY_STREET}\n${COMPANY_POSTAL_CITY}`}<br/>{COMPANY_DETAILS}</p>
      </div>
      <div className="max-w-[310px] pt-16 text-left">
        <p className="font-semibold">{letter.recipient || "Destinataire"}</p>
        <p className="whitespace-pre-line text-[#334155]">{letter.recipientAddress || "Adresse du destinataire"}</p>
      </div>
    </header>
    <div className="mb-10 flex items-end justify-between gap-8">
      <div>{letter.reference ? <p><strong>Référence :</strong> {letter.reference}</p> : null}</div>
      <p>{COMPANY_LETTER_CITY}, le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${letter.date}T12:00:00`))}</p>
    </div>
    <p className="mb-8"><strong>Objet : {letter.subject || "Objet du courrier"}</strong></p>
    <section className="letter-rich-content min-h-[470px]">{richTextNode(letter.content || emptyContent, "letter")}</section>
  </article>;
}

export function LetterManager({ clients, error, onError }: { clients: ClientRecord[]; error: string; onError: (message: string) => void }) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Letter | null>(null);
  const [preview, setPreview] = useState<Letter | null>(null);
  const [exporting, setExporting] = useState(false);
  const letterPaperRef = useRef<HTMLDivElement>(null);

  const refreshLetters = useCallback(async () => {
    try {
      const response = await fetch("/api/letters");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chargement impossible.");
      setLetters(result.letters || []);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Chargement des courriers impossible.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void refreshLetters();
  }, [refreshLetters]);

  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return letters;
    return letters.filter((letter) => `${letter.subject} ${letter.recipient} ${letter.reference}`.toLowerCase().includes(normalized));
  }, [letters, query]);

  function openEditor(letter: Letter) {
    onError("");
    setEditor(letter);
  }

  function field<K extends keyof Letter>(key: K, value: Letter[K]) {
    setEditor((current) => current ? { ...current, [key]: value } : current);
  }

  function selectClient(id: string) {
    const client = clients.find((item) => item.id === id);
    setEditor((current) => current ? {
      ...current,
      clientId: client?.id || null,
      recipient: client ? clientName(client) : current.recipient,
      recipientAddress: client ? clientAddress(client) : current.recipientAddress,
    } : current);
  }

  async function save() {
    if (!editor) return;
    if (!editor.subject.trim()) {
      onError("Renseignez l’objet du courrier.");
      return;
    }
    setSaving(true);
    onError("");
    try {
      const response = await fetch("/api/letters", {
        method: editor.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editor),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Enregistrement impossible.");
      setEditor(null);
      await refreshLetters();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(letter: Letter) {
    if (!window.confirm(`Supprimer le courrier « ${letter.subject} » ?`)) return;
    onError("");
    try {
      const response = await fetch(`/api/letters?id=${encodeURIComponent(letter.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Suppression impossible.");
      await refreshLetters();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Suppression impossible.");
    }
  }

  function printLetter() {
    printDocument(letterPaperRef.current?.firstElementChild as HTMLElement | null);
  }

  async function downloadPdf() {
    const element = letterPaperRef.current?.firstElementChild as HTMLElement | null;
    if (!element || !preview) return;
    setExporting(true);
    onError("");
    try {
      await downloadElementAsPdf(element, fileName(preview.subject, "courrier"));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Téléchargement du PDF impossible.");
    } finally {
      setExporting(false);
    }
  }

  const drafts = letters.filter((letter) => letter.status === "brouillon").length;
  const sent = letters.filter((letter) => letter.status === "envoyé").length;

  return <>
    <div className="mb-8 flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-stretch">
      <div>
        <div className="mb-2 text-xs font-bold tracking-[0.15em] text-ring">GESTION ADMINISTRATIVE</div>
        <h1 className="mb-3 text-5xl leading-none font-medium tracking-[-0.045em] max-sm:text-[39px]">Courriers</h1>
        <p className="m-0 leading-6 text-muted-foreground">Rédigez, corrigez et conservez vos courriers professionnels.</p>
      </div>
      <Button size="lg" onClick={() => openEditor(emptyLetter())}><Plus data-icon="inline-start"/> Nouveau courrier</Button>
    </div>

    <div className="mb-7 grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-sm:gap-2.5">
      <div className="min-h-36 rounded-xl border bg-card p-6 shadow-sm max-sm:min-h-0 max-sm:p-4"><span className="block text-sm font-semibold text-muted-foreground">Courriers enregistrés</span><strong className="my-4 block text-[32px] font-medium tracking-tight max-sm:my-2">{letters.length}</strong><small className="text-muted-foreground">Tous statuts confondus</small></div>
      <div className="min-h-36 rounded-xl border bg-card p-6 shadow-sm max-sm:min-h-0 max-sm:p-4"><span className="block text-sm font-semibold text-muted-foreground">Brouillons</span><strong className="my-4 block text-[32px] font-medium tracking-tight max-sm:my-2">{drafts}</strong><small className="text-muted-foreground">À finaliser</small></div>
      <div className="min-h-36 rounded-xl border bg-card p-6 shadow-sm max-sm:min-h-0 max-sm:p-4"><span className="block text-sm font-semibold text-muted-foreground">Envoyés</span><strong className="my-4 block text-[32px] font-medium tracking-tight max-sm:my-2">{sent}</strong><small className="text-muted-foreground">Courriers transmis</small></div>
    </div>

    <section className="min-h-90 rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-5 border-b p-6 max-lg:flex-col max-lg:items-stretch max-sm:p-5">
        <div><h2 className="mb-1 text-lg font-semibold">Vos courriers</h2><p className="m-0 text-sm leading-6 text-muted-foreground">Retrouvez un courrier par objet, destinataire ou référence.</p></div>
        <label className="flex w-72 items-center gap-2 rounded-lg border px-3 text-muted-foreground max-lg:w-full"><Search className="size-4 shrink-0"/><input aria-label="Rechercher un courrier" className="w-full border-0 bg-transparent py-2 text-sm outline-none" placeholder="Objet, destinataire…" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      </div>
      {loading ? <div className="px-5 py-14 text-center text-muted-foreground">Chargement de vos courriers…</div> : shown.length === 0 ? <div className="px-5 py-14 text-center text-muted-foreground">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-accent text-ring"><Mail/></span>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{letters.length ? "Aucun courrier trouvé" : "Aucun courrier pour le moment"}</h3>
        <p className="mx-auto mb-5 max-w-md text-sm leading-6">{letters.length ? "Essayez une autre recherche." : "Créez votre premier courrier avec l’éditeur et son assistant de correction."}</p>
        {!letters.length ? <Button variant="outline" onClick={() => openEditor(emptyLetter())}><Plus data-icon="inline-start"/> Créer un courrier</Button> : null}
      </div> : <div className="overflow-auto"><table className="w-full min-w-[760px] border-collapse text-left">
        <thead><tr className="bg-muted/40 text-[11px] tracking-wider text-muted-foreground"><th className="px-5 py-4">OBJET</th><th className="px-5 py-4">DESTINATAIRE</th><th className="px-5 py-4">DATE</th><th className="px-5 py-4">STATUT</th><th className="px-5 py-4 text-right">ACTIONS</th></tr></thead>
        <tbody>{shown.map((letter) => <tr key={letter.id} className="hover:bg-muted/30">
          <td className="border-t px-5 py-5 text-sm"><strong className="block text-foreground">{letter.subject}</strong>{letter.reference ? <small className="mt-1 block text-muted-foreground">Réf. {letter.reference}</small> : null}</td>
          <td className="border-t px-5 py-5 text-sm text-muted-foreground">{letter.recipient || "—"}</td>
          <td className="border-t px-5 py-5 text-sm text-muted-foreground">{formatDate(letter.date)}</td>
          <td className="border-t px-5 py-5 text-sm"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-bold capitalize ${statusStyle[letter.status]}`}>{letter.status}</span></td>
          <td className="border-t px-5 py-5"><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Aperçu ${letter.subject}`} onClick={() => setPreview(letter)}><Eye/></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Modifier ${letter.subject}`} onClick={() => openEditor(letter)}><Pencil/></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Supprimer ${letter.subject}`} onClick={() => remove(letter)}><Trash2/></Button></div></td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
      <DialogContent className="grid h-[94vh] w-[min(96vw,1240px)] max-w-[1240px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 sm:max-w-[1240px] max-sm:h-[97dvh] max-sm:w-[calc(100vw-1rem)]">
        <DialogHeader className="border-b px-6 pt-6 pr-14 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pr-12"><DialogTitle>{editor?.id ? "Modifier le courrier" : "Nouveau courrier"}</DialogTitle></DialogHeader>
        {editor ? <div className="min-h-0 overflow-auto p-6 max-sm:p-4">
          <ErrorBanner className="mb-4" message={error} onDismiss={() => onError("")}/>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 max-sm:grid-cols-1">
            <Field className="lg:col-span-2"><FieldLabel htmlFor="letter-subject">Objet</FieldLabel><Input id="letter-subject" value={editor.subject} onChange={(event) => field("subject", event.target.value)} placeholder="Objet du courrier"/></Field>
            <Field><FieldLabel htmlFor="letter-status">Statut</FieldLabel><select id="letter-status" className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-ring" value={editor.status} onChange={(event) => field("status", event.target.value as LetterStatus)}><option value="brouillon">Brouillon</option><option value="finalisé">Finalisé</option><option value="envoyé">Envoyé</option><option value="archivé">Archivé</option></select></Field>
            <Field><FieldLabel htmlFor="letter-date">Date</FieldLabel><DatePicker ariaLabel="Date du courrier" value={editor.date} onChange={(value) => field("date", value)}/></Field>
            <Field><FieldLabel htmlFor="letter-client">Client associé</FieldLabel><select id="letter-client" className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-ring" value={editor.clientId || ""} onChange={(event) => selectClient(event.target.value)}><option value="">Aucun client</option>{clients.map((client) => <option key={client.id} value={client.id}>{clientName(client)}</option>)}</select></Field>
            <Field><FieldLabel htmlFor="letter-recipient">Destinataire</FieldLabel><Input id="letter-recipient" value={editor.recipient} onChange={(event) => field("recipient", event.target.value)}/></Field>
            <Field><FieldLabel htmlFor="letter-reference">Référence</FieldLabel><Input id="letter-reference" value={editor.reference} onChange={(event) => field("reference", event.target.value)} placeholder="Optionnelle"/></Field>
            <Field className="lg:col-span-2"><FieldLabel htmlFor="letter-address">Adresse du destinataire</FieldLabel><Textarea id="letter-address" rows={3} value={editor.recipientAddress} onChange={(event) => field("recipientAddress", event.target.value)} placeholder="Une ligne par élément d’adresse"/></Field>
          </div>
          <LetterEditor key={editor.id || "new"} content={editor.content || emptyContent} onChange={(content) => field("content", content)}/>
          <div className="mt-6 flex flex-wrap justify-end gap-2.5"><Button type="button" variant="outline" onClick={() => setPreview(editor)}><Eye data-icon="inline-start"/> Aperçu</Button><Button type="button" variant="outline" onClick={() => setEditor(null)}>Annuler</Button><Button type="button" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer le courrier"}</Button></div>
        </div> : null}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
      <DialogContent className="grid h-[96vh] w-[min(97vw,1040px)] max-w-[1040px] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[1040px] max-sm:h-[98dvh] max-sm:w-[calc(100vw-.5rem)]">
        <DialogHeader className="px-6 pt-6 pr-14 pb-3 max-sm:px-4 max-sm:pt-4 max-sm:pr-12"><DialogTitle>Aperçu du courrier</DialogTitle></DialogHeader>
        {preview ? <>
          <div className="flex flex-wrap gap-2 border-b px-6 pb-4 max-sm:px-4">
            <Button type="button" variant="outline" onClick={() => { setEditor(preview); setPreview(null); }}><Pencil data-icon="inline-start"/> Modifier</Button>
            <Button type="button" variant="outline" onClick={printLetter}><Printer data-icon="inline-start"/> Imprimer</Button>
            <Button type="button" disabled={exporting} onClick={downloadPdf}>{exporting ? <LoaderCircle className="animate-spin" data-icon="inline-start"/> : <Download data-icon="inline-start"/>}{exporting ? "Création du PDF…" : "Télécharger en PDF"}</Button>
          </div>
          <div className="min-h-0 overflow-auto bg-slate-200 p-7 max-sm:p-2">
            <div ref={letterPaperRef}><LetterPaper letter={preview}/></div>
          </div>
        </> : null}
      </DialogContent>
    </Dialog>
  </>;
}
