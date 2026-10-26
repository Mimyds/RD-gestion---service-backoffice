"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LegalNumberInput } from "@/components/legal-number-input";
import { Textarea } from "@/components/ui/textarea";
import { type CompanySettings, SETTINGS_LIMITS } from "@/lib/company";
import { apiFetch } from "@/lib/http";
import { isValidSiret, siretDigits } from "@/lib/siret";
import { frenchVatDigits, isValidFrenchVatNumber, normalizeFrenchVatNumber } from "@/lib/vat-number";

type FieldConfig = { key: keyof CompanySettings; label: string; multiline?: boolean; type?: string; description?: string; wide?: boolean };

const sections: { title: string; fields: FieldConfig[] }[] = [
  {
    title: "Entreprise",
    fields: [
      { key: "accountName", label: "Nom et prénom du compte", description: "Utilisés par défaut dans « Suivi par » sur les factures." },
      { key: "name", label: "Raison sociale" },
      { key: "address", label: "Adresse", multiline: true, description: "Une ligne par élément d’adresse si besoin." },
      { key: "email", label: "E-mail", type: "email" },
      { key: "phone", label: "Téléphone", type: "tel" },
      { key: "siret", label: "SIRET", description: "14 chiffres identifiant l’établissement émetteur." },
      { key: "vatNumber", label: "N° de TVA intracommunautaire", description: "À laisser vide si l’entreprise n’en possède pas." },
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
  const [values, setValues] = useState(() => ({
    ...initial,
    siret: siretDigits(initial.siret),
    vatNumber: initial.vatNumber ? normalizeFrenchVatNumber(initial.vatNumber) : "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const siretInvalid = Boolean(validationAttempted && values.siret && !isValidSiret(values.siret));
  const siretError = values.siret.length === 14 ? "Ce numéro SIRET n’est pas valide." : "Le SIRET doit comporter 14 chiffres.";
  const vatDigits = frenchVatDigits(values.vatNumber);
  const vatInvalid = Boolean(validationAttempted && values.vatNumber && !isValidFrenchVatNumber(values.vatNumber));
  const vatError = vatDigits.length === 11 ? "Ce numéro de TVA intracommunautaire n’est pas valide." : "Le numéro de TVA doit comporter FR suivi de 11 chiffres.";

  async function save() {
    setValidationAttempted(true);
    if (!values.accountName.trim() || !values.name.trim() || !values.address.trim()) {
      setError("Le nom du compte, la raison sociale et l’adresse sont requis.");
      return;
    }
    if (values.siret && !isValidSiret(values.siret)) {
      setError(siretError);
      return;
    }
    if (values.vatNumber && !isValidFrenchVatNumber(values.vatNumber)) {
      setError(vatError);
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
    {sections.map((section) => <FieldSet className="gap-4 rounded-xl border bg-muted/20 p-5 max-sm:p-4" key={section.title}>
      <FieldLegend className="px-1">{section.title}</FieldLegend>
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {section.fields.map(({ key, label, multiline, type, description, wide }) => {
          const id = `settings-${key}`;
          const props = { id, value: values[key], maxLength: SETTINGS_LIMITS[key], onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value })) };
          if (key === "siret") return <Field data-invalid={siretInvalid || undefined} key={key} className="col-span-full">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <LegalNumberInput id={id} kind="siret" aria-invalid={siretInvalid || undefined} value={values.siret} onValueChange={value => { setValues(current => ({ ...current, siret: value })); setError(""); }}/>
            {siretInvalid ? <FieldError>{siretError}</FieldError> : <FieldDescription>SIREN à 9 chiffres, puis NIC à 5 chiffres.</FieldDescription>}
          </Field>;
          if (key === "vatNumber") return <Field data-invalid={vatInvalid || undefined} key={key} className="col-span-full">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <LegalNumberInput id={id} kind="vat" aria-invalid={vatInvalid || undefined} value={values.vatNumber} onValueChange={value => { setValues(current => ({ ...current, vatNumber: value })); setError(""); }}/>
            {vatInvalid ? <FieldError>{vatError}</FieldError> : <FieldDescription>FR, clé de contrôle à 2 chiffres, puis SIREN à 9 chiffres. À laisser vide si l’entreprise n’en possède pas.</FieldDescription>}
          </Field>;
          return <Field key={key} className={wide || multiline ? "col-span-full" : undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {multiline ? <Textarea {...props} className={wide ? "min-h-28" : "min-h-16"}/> : <Input {...props} type={type}/>}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </Field>;
        })}
      </div>
    </FieldSet>)}
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
