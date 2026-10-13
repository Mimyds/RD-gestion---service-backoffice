import type { InvoiceStatus } from "@/lib/invoices";

export const isInvoiceLocked = (status: InvoiceStatus) => status !== "brouillon";

export const isAllowedLockedStatusChange = (current: InvoiceStatus, requested: unknown) =>
  current === "envoyée" && requested === "payée";
