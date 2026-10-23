import { type CompanySettings, companyDetails } from "@/lib/company";
import { localDate } from "@/lib/dates";

export type InvoiceLine = { period?: string; description: string; quantity: number; unitPrice: number; taxRate: number };
export type InvoiceStatus = "brouillon" | "envoyée" | "payée";
export type OperationCategory = "services" | "biens" | "mixte";
export type Invoice = { id: string; clientId?: string | null; number: string; client: string; clientType: "entreprise" | "particulier"; clientAddress: string; clientEmail: string; clientSiret?: string; clientVatNumber?: string; purchaseOrderNumber?: string; serviceDate: string; operationCategory: OperationCategory; issueDate: string; dueDate: string; status: InvoiceStatus; lines: InvoiceLine[]; notes: string; followedBy: string; purpose?: string; bankDetails?: string; issuer: string; issuerAddress: string; issuerDetails: string; issuerSiret?: string; issuerVatNumber?: string; footer?: string; currency: string };

export const blankLine = (): InvoiceLine => ({ description: "", quantity: 1, unitPrice: 0, taxRate: 0 });

export const blankInvoice = (company: CompanySettings): Invoice => ({ id: "", clientId: null, number: "", client: "", clientType: "entreprise", clientAddress: "", clientEmail: "", clientSiret: "", clientVatNumber: "", purchaseOrderNumber: "", serviceDate: localDate(), operationCategory: "services", issueDate: localDate(), dueDate: localDate(), status: "brouillon", lines: [blankLine()], notes: company.legalMentions, followedBy: company.accountName, purpose: "PRESTATION DE SERVICE", bankDetails: company.bankDetails, issuer: company.name, issuerAddress: company.address, issuerDetails: companyDetails(company), issuerSiret: company.siret, issuerVatNumber: company.vatNumber, footer: company.footer, currency: "EUR" });

export const money = (n: number, currency = "EUR") => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(n);
export const lineTotal = (l: InvoiceLine) => Number(l.quantity || 0) * Number(l.unitPrice || 0);
export const subtotal = (i: Invoice) => i.lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0);
export const total = (i: Invoice) => i.lines.reduce((s, l) => s + lineTotal(l), 0);

export const operationCategoryLabel = (category: OperationCategory) => category === "biens"
  ? "Livraisons de biens"
  : category === "mixte" ? "Livraisons de biens et prestations de services" : "Prestations de services";

// Follows the highest existing FAC-YYYY-NNN number so deletions never cause collisions.
export function nextInvoiceNumber(invoices: Invoice[], year = new Date().getFullYear()) {
  const prefix = `FAC-${year}-`;
  const highest = invoices.reduce((max, invoice) => {
    if (!invoice.number.startsWith(prefix)) return max;
    const sequence = Number(invoice.number.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

// Drafts always display the current company settings; sent and paid invoices keep their stored snapshot.
export const withCurrentCompany = (invoice: Invoice, company: CompanySettings): Invoice => invoice.status === "brouillon"
  ? { ...invoice, issuer: company.name, issuerAddress: company.address, issuerDetails: companyDetails(company), issuerSiret: company.siret, issuerVatNumber: company.vatNumber, footer: company.footer }
  : invoice;
