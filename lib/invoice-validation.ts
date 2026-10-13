import { isValidSiret } from "@/lib/siret";
import { isValidFrenchVatNumber } from "@/lib/vat-number";

export type InvoiceFieldErrors = Record<string, string>;

const sized = (value: unknown, max: number) => typeof value === "string" && value.length <= max;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateInvoice(input: any): InvoiceFieldErrors {
  const errors: InvoiceFieldErrors = {};
  if (!input || typeof input !== "object") return { form: "Les données de la facture sont invalides." };

  if (typeof input.number !== "string" || !input.number.trim()) errors.number = "Le numéro de facture est requis.";
  else if (input.number.length > 80) errors.number = "Le numéro ne doit pas dépasser 80 caractères.";

  if (typeof input.client !== "string" || !input.client.trim()) errors.client = "Sélectionnez ou ajoutez un client.";
  else if (input.client.length > 200) errors.client = "Le nom du client ne doit pas dépasser 200 caractères.";
  if (!["entreprise", "particulier"].includes(input.clientType)) errors.client = "Le type de client est invalide.";

  if (!sized(input.clientAddress, 1_000)) errors.clientAddress = "L’adresse ne doit pas dépasser 1 000 caractères.";
  if (!sized(input.clientEmail, 254)) errors.clientEmail = "L’adresse e-mail ne doit pas dépasser 254 caractères.";
  if (!sized(input.clientSiret, 30)) errors.clientSiret = "Le SIRET ne doit pas dépasser 30 caractères.";
  else if (input.clientSiret && !isValidSiret(input.clientSiret)) errors.clientSiret = "Le SIRET doit comporter 14 chiffres et être valide.";
  if (!sized(input.clientVatNumber, 20)) errors.clientVatNumber = "Le numéro de TVA ne doit pas dépasser 20 caractères.";
  else if (input.clientVatNumber && !isValidFrenchVatNumber(input.clientVatNumber)) errors.clientVatNumber = "Le numéro de TVA doit comporter FR suivi de 11 chiffres valides.";
  if (!sized(input.deliveryAddress, 1_000)) errors.deliveryAddress = "L’adresse de livraison ne doit pas dépasser 1 000 caractères.";
  if (!sized(input.purchaseOrderNumber, 120)) errors.purchaseOrderNumber = "Le numéro de bon de commande ne doit pas dépasser 120 caractères.";
  if (!sized(input.notes, 5_000)) errors.notes = "Les notes ne doivent pas dépasser 5 000 caractères.";
  if (input.followedBy !== undefined && !sized(input.followedBy, 200)) errors.followedBy = "Le nom du contact ne doit pas dépasser 200 caractères.";
  if (input.purpose !== undefined && !sized(input.purpose, 300)) errors.purpose = "L’objet ne doit pas dépasser 300 caractères.";

  if (!["services", "biens", "mixte"].includes(input.operationCategory)) errors.operationCategory = "Sélectionnez une nature d’opération valide.";
  if (!["brouillon", "envoyée", "payée"].includes(input.status)) errors.status = "Le statut de la facture est invalide.";
  if (!["EUR", "USD"].includes(input.currency)) errors.currency = "Sélectionnez une devise valide.";
  if (typeof input.issueDate !== "string" || !datePattern.test(input.issueDate)) errors.issueDate = "Sélectionnez une date d’émission valide.";
  if (typeof input.serviceDate !== "string" || !datePattern.test(input.serviceDate)) errors.serviceDate = "Sélectionnez une date de prestation valide.";
  if (typeof input.dueDate !== "string" || !datePattern.test(input.dueDate)) errors.dueDate = "Sélectionnez une date d’échéance valide.";

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.lines = "Ajoutez au moins une prestation.";
  } else if (input.lines.length > 100) {
    errors.lines = "Une facture ne peut pas contenir plus de 100 prestations.";
  } else {
    input.lines.forEach((line: any, index: number) => {
      const prefix = `lines.${index}`;
      if (typeof line?.description !== "string" || !line.description.trim()) errors[`${prefix}.description`] = "La description de la prestation est requise.";
      else if (line.description.length > 500) errors[`${prefix}.description`] = "La description ne doit pas dépasser 500 caractères.";
      if (line?.period !== undefined && !sized(line.period, 100)) errors[`${prefix}.period`] = "La période ne doit pas dépasser 100 caractères.";
      if (!Number.isFinite(line?.quantity) || line.quantity <= 0) errors[`${prefix}.quantity`] = "La quantité doit être supérieure à 0.";
      else if (line.quantity > 1_000_000) errors[`${prefix}.quantity`] = "La quantité est trop élevée.";
      if (!Number.isFinite(line?.unitPrice) || line.unitPrice < 0) errors[`${prefix}.unitPrice`] = "Le prix doit être positif ou nul.";
      else if (line.unitPrice > 1_000_000_000) errors[`${prefix}.unitPrice`] = "Le prix est trop élevé.";
      if (!Number.isFinite(line?.taxRate) || line.taxRate < 0 || line.taxRate > 100) errors[`${prefix}.taxRate`] = "La taxe doit être comprise entre 0 et 100 %.";
    });
  }

  return errors;
}
