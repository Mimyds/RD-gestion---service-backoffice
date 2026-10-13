import type { Letter } from "@/components/letter-manager";
import type { CompanySettings } from "@/lib/company";
import type { Invoice } from "@/lib/invoices";

// The PDF renderer and templates are loaded on demand: they are only needed when a document is exported.
export async function invoicePdf(invoice: Invoice) {
  const [{ pdf }, { InvoiceDocument }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/pdf/invoice-document")]);
  return pdf(<InvoiceDocument invoice={invoice}/>).toBlob();
}

export async function letterPdf(letter: Letter, company: CompanySettings) {
  const [{ pdf }, { LetterDocument }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/pdf/letter-document")]);
  return pdf(<LetterDocument letter={letter} company={company}/>).toBlob();
}

export async function downloadPdf(render: () => Promise<Blob>, filename: string) {
  const rendered = await render();
  const blob = rendered.type === "application/pdf"
    ? rendered
    : new Blob([rendered], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pdf`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  // Keep the link for one frame so Chromium can commit the target filename,
  // then release the Blob promptly instead of leaving a pending .crdownload.
  window.requestAnimationFrame(() => {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  });
}

export async function printPdf(render: () => Promise<Blob>) {
  // The tab must be opened synchronously, during the click, or pop-up blockers refuse it.
  const tab = window.open("", "_blank");
  if (!tab) throw new Error("Autorisez les fenêtres contextuelles pour ouvrir le PDF à imprimer.");
  tab.opener = null;

  let url: string;
  try {
    url = URL.createObjectURL(await render());
  } catch (cause) {
    tab.close();
    throw cause;
  }

  tab.location.href = url;
  // Keep the Blob alive while the user views and prints it from the browser's PDF reader.
  window.setTimeout(() => URL.revokeObjectURL(url), 600_000);
}
