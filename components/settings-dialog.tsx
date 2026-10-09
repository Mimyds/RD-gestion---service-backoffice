"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type CompanySettings, SETTINGS_LIMITS } from "@/lib/company";
import { apiFetch } from "@/lib/http";

type FieldConfig = { key: keyof CompanySettings; label: string; multiline?: boolean; type?: string; description?: string; wide?: boolean };

const sections: { title: string; fields: FieldConfig[] }[] = [
  {
    title: "Entreprise",
    fields: [
      { key: "name", label: "Raison sociale" },
      { key: "address", label: "Adresse", multiline: true, description: "Une ligne par élément d’adresse si besoin." },
      { key: "email", label: "E-mail", type: "email" },
      { key: "phone", label: "Téléphone", type: "tel" },
      { key: "letterCity", label: "Ville des courriers", description: "Utilisée dans « Ville, le … » en tête des courriers." },
    ],
  },
  {
    title: "Facturation",
    fields: [
      { key: "bankDetails", label: "Coordonnées bancaires", multiline: true, wide: true, description: "Proposées par défaut sur chaque nouvelle facture." },
      { key: "legalMentions", label: "Mentions légales et conditions", multiline: true, wide: true, description: "Proposées par défaut dans « Notes et modalités »." },
      { key: "footer", label: "Pied de page des factures", multiline: true, wide: true },
    ],
  },
];

function SettingsForm({ initial, onCancel, onSaved }: { initial: CompanySettings; onCancel: () => void; onSaved: (settings: CompanySettings) => void }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!values.name.trim() || !values.address.trim()) {
      setError("La raison sociale et l’adresse sont requises.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Enregistrement impossible.");
      onSaved(result.settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return <FieldGroup className="gap-6">
    <ErrorBanner message={error} onDismiss={() => setError("")}/>
    {sections.map((section) => <section key={section.title}>
      <h3 className="mb-3 border-t pt-3 text-sm font-semibold">{section.title}</h3>
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {section.fields.map(({ key, label, multiline, type, description, wide }) => {
          const id = `settings-${key}`;
          const props = { id, value: values[key], maxLength: SETTINGS_LIMITS[key], onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value })) };
          return <Field key={key} className={wide || multiline ? "col-span-full" : undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {multiline ? <Textarea {...props} className={wide ? "min-h-28" : "min-h-16"}/> : <Input {...props} type={type}/>}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </Field>;
        })}
      </div>
    </section>)}
    <p className="rounded-lg bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">Les modifications s’appliquent aux nouvelles factures, aux brouillons et aux courriers. Les factures envoyées ou payées conservent les informations en vigueur au moment de leur envoi.</p>
    <div className="flex justify-end gap-2.5">
      <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      <Button type="button" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer les réglages"}</Button>
    </div>
  </FieldGroup>;
}

export function SettingsDialog({ open, settings, onOpenChange, onSaved }: { open: boolean; settings: CompanySettings; onOpenChange: (open: boolean) => void; onSaved: (settings: CompanySettings) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] w-[min(92vw,860px)] max-w-[860px] overflow-auto p-6 sm:max-w-[860px] max-sm:w-[98vw] max-sm:p-4">
      <DialogHeader>
        <DialogTitle>Réglages</DialogTitle>
        <DialogDescription>Informations de RD Gestion & Services utilisées sur les factures et les courriers.</DialogDescription>
      </DialogHeader>
      {open ? <SettingsForm initial={settings} onCancel={() => onOpenChange(false)} onSaved={(saved) => { onSaved(saved); onOpenChange(false); }}/> : null}
    </DialogContent>
  </Dialog>;
}
