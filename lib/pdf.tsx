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

// Safari (iOS and macOS) cannot print a PDF shown in a hidden iframe: open it in a tab, where its own print/share menu prints it page for page.
const printsInTab = () => /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  || /^((?!chrome|crios|fxios|android|edg).)*safari/i.test(navigator.userAgent);

export async function printPdf(render: () => Promise<Blob>) {
  // The tab must be opened synchronously, during the click, or pop-up blockers refuse it.
  const tab = printsInTab() ? window.open("", "_blank") : null;
  let url: string;
  try {
    url = URL.createObjectURL(await render());
  } catch (cause) {
    tab?.close();
    throw cause;
  }

  if (printsInTab()) {
    if (tab) tab.location.href = url;
    else window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 600_000);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "100%";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 120_000);
}
