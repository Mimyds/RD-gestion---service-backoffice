"use client"

import { useMemo, useState } from "react"
import { Building2, Mail, Pencil, Phone, Plus, Search, Trash2, UserRound, UsersRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type ClientRecord = {
  id: string
  type: "entreprise" | "particulier"
  company_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  siret: string | null
  vat_number: string | null
  notes: string | null
}

type ClientDraft = {
  id?: string
  type: "entreprise" | "particulier"
  companyName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
  country: string
  siret: string
  vatNumber: string
  notes: string
}

const emptyClient = (): ClientDraft => ({
  type: "entreprise",
  companyName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
  siret: "",
  vatNumber: "",
  notes: "",
})

const nameOf = (client: ClientRecord) => client.type === "entreprise"
  ? client.company_name || "Client sans nom"
  : [client.first_name, client.last_name].filter(Boolean).join(" ") || "Client sans nom"

const draftOf = (client: ClientRecord): ClientDraft => ({
  id: client.id,
  type: client.type,
  companyName: client.company_name || "",
  firstName: client.first_name || "",
  lastName: client.last_name || "",
  email: client.email || "",
  phone: client.phone || "",
  addressLine1: client.address_line1 || "",
  addressLine2: client.address_line2 || "",
  postalCode: client.postal_code || "",
  city: client.city || "",
  country: client.country || "France",
  siret: client.siret || "",
  vatNumber: client.vat_number || "",
  notes: client.notes || "",
})

export function ClientManager({
  clients,
  loading,
  onChanged,
  onError,
}: {
  clients: ClientRecord[]
  loading: boolean
  onChanged: () => Promise<void>
  onError: (message: string) => void
}) {
  const [query, setQuery] = useState("")
  const [editor, setEditor] = useState<ClientDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return clients
    return clients.filter((client) => [nameOf(client), client.email, client.phone, client.city, client.siret]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized))
  }, [clients, query])

  function setField<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) {
    setEditor((current) => current ? { ...current, [key]: value } : current)
  }

  async function saveClient() {
    if (!editor) return
    setSaving(true)
    onError("")
    try {
      const response = await fetch("/api/clients", {
        method: editor.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editor),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Enregistrement impossible.")
      setEditor(null)
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteClient(client: ClientRecord) {
    if (!window.confirm(`Supprimer le client ${nameOf(client)} ?`)) return
    onError("")
    try {
      const response = await fetch(`/api/clients?id=${encodeURIComponent(client.id)}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Suppression impossible.")
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "Suppression impossible.")
    }
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-stretch">
        <div>
          <div className="mb-2 text-xs font-bold tracking-[0.15em] text-ring">GESTION COMMERCIALE</div>
          <h1 className="mb-3 text-5xl leading-none font-medium tracking-[-0.045em] max-sm:text-[39px]">Clients</h1>
          <p className="m-0 leading-6 text-muted-foreground">Centralisez les coordonnées utilisées dans vos factures et courriers.</p>
        </div>
        <Button size="lg" onClick={() => setEditor(emptyClient())}>
          <Plus data-icon="inline-start" /> Nouveau client
        </Button>
      </div>

      <div className="mb-7 grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-sm:gap-2.5">
        <div className="min-h-36 rounded-xl border bg-card p-6 shadow-sm max-sm:min-h-0 max-sm:p-4"><span className="block text-sm font-semibold text-muted-foreground">Clients enregistrés</span><strong className="my-4 block text-[32px] font-medium tracking-tight max-sm:my-2 max-sm:text-[27px]">{clients.length}</strong><small className="block text-[13px] text-muted-foreground">Dans votre répertoire</small></div>
        <div className="min-h-36 rounded-xl border bg-card p-6 shadow-sm max-sm:min-h-0 max-sm:p-4"><span className="block text-sm font-semibold text-muted-foreground">Entreprises</span><strong className="my-4 block text-[32px] font-medium tracking-tight max-sm:my-2 max-sm:text-[27px]">{clients.filter((client) => client.type === "entreprise").length}</strong><small className="block text-[13px] text-muted-foreground">Raisons sociales</small></div>
        <div className="min-h-36 rounded-xl border bg-card p-6 shadow-sm max-sm:min-h-0 max-sm:p-4"><span className="block text-sm font-semibold text-muted-foreground">Particuliers</span><strong className="my-4 block text-[32px] font-medium tracking-tight max-sm:my-2 max-sm:text-[27px]">{clients.filter((client) => client.type === "particulier").length}</strong><small className="block text-[13px] text-muted-foreground">Contacts individuels</small></div>
      </div>

      <section className="min-h-90 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-5 border-b p-6 max-lg:flex-col max-lg:items-stretch max-sm:p-5">
          <div><h2 className="mb-1 text-lg font-semibold">Répertoire clients</h2><p className="m-0 text-sm leading-6 text-muted-foreground">Recherchez et mettez à jour vos contacts.</p></div>
          <label className="flex w-64 items-center gap-2 rounded-lg border px-3 text-muted-foreground max-lg:w-full">
            <Search className="size-4 shrink-0" />
            <input className="w-full border-0 bg-transparent py-2 text-sm outline-none" aria-label="Rechercher un client" placeholder="Nom, e-mail, ville…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        {loading ? <div className="px-5 py-14 text-center text-muted-foreground">Chargement de vos clients…</div> : shown.length === 0 ? (
          <div className="px-5 py-14 text-center text-muted-foreground">
            <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-accent text-ring"><UsersRound /></span>
            <h3 className="mb-2 text-lg font-semibold text-foreground">{clients.length ? "Aucun client trouvé" : "Votre répertoire est vide"}</h3>
            <p className="mx-auto mb-5 max-w-96 text-sm leading-6">{clients.length ? "Essayez une autre recherche." : "Ajoutez votre premier client pour le retrouver lors de la création d’une facture."}</p>
            {!clients.length && <Button variant="outline" onClick={() => setEditor(emptyClient())}><Plus data-icon="inline-start" /> Ajouter un client</Button>}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="bg-muted/40 text-[11px] tracking-wider text-muted-foreground"><th className="px-5 py-4">CLIENT</th><th className="px-5 py-4">CONTACT</th><th className="px-5 py-4">ADRESSE</th><th className="px-5 py-4">TYPE</th><th className="px-5 py-4 text-right">ACTIONS</th></tr></thead>
              <tbody>{shown.map((client) => (
                <tr className="hover:bg-muted/30" key={client.id}>
                  <td className="border-t px-5 py-5 text-sm"><div className="flex items-center gap-3 text-foreground [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-ring">{client.type === "entreprise" ? <Building2 /> : <UserRound />}<div><strong className="block">{nameOf(client)}</strong>{client.siret && <small className="mt-1 block text-[11px] font-normal text-muted-foreground">SIRET {client.siret}</small>}</div></div></td>
                  <td className="border-t px-5 py-5 text-sm text-muted-foreground"><div className="grid gap-1.5">{client.email && <span className="flex items-center gap-2 [&>svg]:size-3.5 [&>svg]:shrink-0"><Mail />{client.email}</span>}{client.phone && <span className="flex items-center gap-2 [&>svg]:size-3.5 [&>svg]:shrink-0"><Phone />{client.phone}</span>}{!client.email && !client.phone && "—"}</div></td>
                  <td className="border-t px-5 py-5 text-sm text-muted-foreground">{[client.address_line1, [client.postal_code, client.city].filter(Boolean).join(" ")].filter(Boolean).map((line) => <span className="block" key={line}>{line}</span>)}{!client.address_line1 && !client.city && "—"}</td>
                  <td className="border-t px-5 py-5 text-sm"><span className="inline-block rounded-full bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground capitalize">{client.type}</span></td>
                  <td className="border-t px-5 py-5 text-sm"><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Modifier ${nameOf(client)}`} onClick={() => setEditor(draftOf(client))}><Pencil /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Supprimer ${nameOf(client)}`} onClick={() => deleteClient(client)}><Trash2 /></Button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[92vh] w-[min(92vw,860px)] max-w-[860px] overflow-auto p-6 max-sm:w-[98vw] max-sm:p-4">
          <DialogHeader><DialogTitle>{editor?.id ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          {editor && <FieldGroup className="gap-5">
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <Field><FieldLabel htmlFor="client-type">Type de client</FieldLabel><select className="h-9 rounded-lg border bg-background px-2.5 text-foreground outline-ring" id="client-type" value={editor.type} onChange={(event) => setField("type", event.target.value as ClientDraft["type"])}><option value="entreprise">Entreprise</option><option value="particulier">Particulier</option></select></Field>
              {editor.type === "entreprise" ? <Field><FieldLabel htmlFor="company-name">Raison sociale</FieldLabel><Input id="company-name" value={editor.companyName} onChange={(event) => setField("companyName", event.target.value)} /></Field> : <><Field><FieldLabel htmlFor="first-name">Prénom</FieldLabel><Input id="first-name" value={editor.firstName} onChange={(event) => setField("firstName", event.target.value)} /></Field><Field><FieldLabel htmlFor="last-name">Nom</FieldLabel><Input id="last-name" value={editor.lastName} onChange={(event) => setField("lastName", event.target.value)} /></Field></>}
              <Field><FieldLabel htmlFor="client-email">E-mail</FieldLabel><Input id="client-email" type="email" value={editor.email} onChange={(event) => setField("email", event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="client-phone">Téléphone</FieldLabel><Input id="client-phone" type="tel" value={editor.phone} onChange={(event) => setField("phone", event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="address-line-1">Adresse</FieldLabel><Input id="address-line-1" value={editor.addressLine1} onChange={(event) => setField("addressLine1", event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="address-line-2">Complément d’adresse</FieldLabel><Input id="address-line-2" value={editor.addressLine2} onChange={(event) => setField("addressLine2", event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="postal-code">Code postal</FieldLabel><Input id="postal-code" value={editor.postalCode} onChange={(event) => setField("postalCode", event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="client-city">Ville</FieldLabel><Input id="client-city" value={editor.city} onChange={(event) => setField("city", event.target.value)} /></Field>
              <Field><FieldLabel htmlFor="client-country">Pays</FieldLabel><Input id="client-country" value={editor.country} onChange={(event) => setField("country", event.target.value)} /></Field>
              {editor.type === "entreprise" && <><Field><FieldLabel htmlFor="client-siret">SIRET</FieldLabel><Input id="client-siret" value={editor.siret} onChange={(event) => setField("siret", event.target.value)} /></Field><Field><FieldLabel htmlFor="vat-number">N° de TVA</FieldLabel><Input id="vat-number" value={editor.vatNumber} onChange={(event) => setField("vatNumber", event.target.value)} /></Field></>}
            </div>
            <Field><FieldLabel htmlFor="client-notes">Notes</FieldLabel><Textarea className="min-h-24" id="client-notes" value={editor.notes} onChange={(event) => setField("notes", event.target.value)} /></Field>
            <div className="flex justify-end gap-2.5"><Button type="button" variant="outline" onClick={() => setEditor(null)}>Annuler</Button><Button type="button" disabled={saving} onClick={saveClient}>{saving ? "Enregistrement…" : "Enregistrer le client"}</Button></div>
          </FieldGroup>}
        </DialogContent>
      </Dialog>
    </>
  )
}
