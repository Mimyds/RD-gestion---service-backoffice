const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

export function printDocument(element: HTMLElement | null) {
  if (!element) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.right = "100%";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((stylesheet) => stylesheet.outerHTML)
    .join("\n");

  iframe.onload = async () => {
    const printWindow = iframe.contentWindow;
    const printDocument = iframe.contentDocument;
    if (!printWindow || !printDocument) {
      iframe.remove();
      return;
    }

    await printDocument.fonts.ready;
    await Promise.all(Array.from(printDocument.images).map((image) => image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));

    printWindow.focus();
    printWindow.print();

    window.setTimeout(() => iframe.remove(), 120_000);
  };

  iframe.srcdoc = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <base href="${window.location.origin}/">
    <title>${escapeHtml(document.title)}</title>
    ${styles}
    <style>
      @page { size: A4 portrait; margin: 0; }
      html, body {
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
        font-family: Arial, Helvetica, sans-serif !important;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .letter-print-root {
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 18mm 20mm !important;
        box-shadow: none !important;
      }
      .invoice-print-root {
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 15mm 13mm 8mm !important;
        border: 0 !important;
        box-shadow: none !important;
      }
    </style>
  </head>
  <body>${element.outerHTML}</body>
</html>`;

  document.body.appendChild(iframe);
}
