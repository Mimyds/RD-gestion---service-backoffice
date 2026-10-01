import type { createClient } from "@/lib/supabase/server";
import { type CompanySettings, companyDetails, DEFAULT_COMPANY } from "@/lib/company";

type Database = Awaited<ReturnType<typeof createClient>>;
type Templates = Record<string, unknown>;
type SettingsRow = {
  issuer: string | null;
  issuer_address: string | null;
  issuer_details: string | null;
  email: string | null;
  phone: string | null;
  invoice_template: Templates | null;
  letter_template: Templates | null;
};

export const SETTINGS_COLUMNS = "issuer,issuer_address,issuer_details,email,phone,invoice_template,letter_template";

const text = (value: unknown) => typeof value === "string" && value.trim() ? value : "";

export function settingsFromRow(row: SettingsRow | null): CompanySettings {
  const invoice = row?.invoice_template || {};
  const letter = row?.letter_template || {};
  // Accounts created before the settings screen only have the combined « issuer_details » column.
  const [legacyEmail = "", legacyPhone = ""] = (row?.issuer_details || "").split("\n");
  return {
    name: text(row?.issuer) || DEFAULT_COMPANY.name,
    address: text(row?.issuer_address) || DEFAULT_COMPANY.address,
    email: text(row?.email) || text(legacyEmail) || DEFAULT_COMPANY.email,
    phone: text(row?.phone) || text(legacyPhone) || DEFAULT_COMPANY.phone,
    letterCity: text(letter.city) || DEFAULT_COMPANY.letterCity,
    bankDetails: text(invoice.bankDetails) || DEFAULT_COMPANY.bankDetails,
    legalMentions: text(invoice.legalMentions) || DEFAULT_COMPANY.legalMentions,
    footer: text(invoice.footer) || DEFAULT_COMPANY.footer,
  };
}

export async function loadSettings(db: Database, user: string) {
  const { data, error } = await db.from("users").select(SETTINGS_COLUMNS).eq("id", user).maybeSingle();
  return { row: data as SettingsRow | null, settings: settingsFromRow(data as SettingsRow | null), error };
}

export function settingsToRow(settings: CompanySettings, current: SettingsRow | null) {
  return {
    issuer: settings.name,
    issuer_address: settings.address,
    issuer_details: companyDetails(settings),
    email: settings.email || null,
    phone: settings.phone || null,
    invoice_template: { ...(current?.invoice_template || {}), bankDetails: settings.bankDetails, legalMentions: settings.legalMentions, footer: settings.footer },
    letter_template: { ...(current?.letter_template || {}), city: settings.letterCity },
  };
}

// Company block copied into each invoice so issued documents keep the details in force when they left draft.
export const issuerSnapshot = (settings: CompanySettings) => ({
  issuer: settings.name,
  issuerAddress: settings.address,
  issuerDetails: companyDetails(settings),
  footer: settings.footer,
});

type Snapshot = ReturnType<typeof issuerSnapshot>;

// Company block stored on an invoice, completed with the current settings for older invoices that lack a field.
export const storedSnapshot = (payload: Record<string, unknown>, current: Snapshot): Snapshot => ({
  issuer: text(payload.issuer) || current.issuer,
  issuerAddress: text(payload.issuerAddress) || current.issuerAddress,
  issuerDetails: text(payload.issuerDetails) || current.issuerDetails,
  footer: text(payload.footer) || current.footer,
});
