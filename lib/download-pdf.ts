export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const exportScale = 3;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  await document.fonts.ready;
  await Promise.all(Array.from(element.querySelectorAll("img")).map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));

  const imageSnapshots = Array.from(element.querySelectorAll("img")).map((image) => {
    const rendered = image.getBoundingClientRect();
    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = Math.max(1, Math.round(rendered.width * exportScale));
    imageCanvas.height = Math.max(1, Math.round(rendered.height * exportScale));
    const imageContext = imageCanvas.getContext("2d");
    if (!imageContext) throw new Error("Une image du document n’a pas pu être préparée.");
    imageContext.imageSmoothingEnabled = true;
    imageContext.imageSmoothingQuality = "high";
    imageContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
    return {
      source: imageCanvas.toDataURL("image/png"),
      width: rendered.width,
      height: rendered.height,
    };
  });

  const canvas = await html2canvas(element, {
    scale: exportScale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (_document, clonedElement) => {
      clonedElement.style.boxShadow = "none";
      clonedElement.style.border = "0";
      clonedElement.style.width = "794px";
      clonedElement.style.minHeight = "1123px";
      Array.from(clonedElement.querySelectorAll("img")).forEach((image, index) => {
        const snapshot = imageSnapshots[index];
        if (!snapshot) return;
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.src = snapshot.source;
        image.width = Math.round(snapshot.width);
        image.height = Math.round(snapshot.height);
        image.style.width = `${snapshot.width}px`;
        image.style.height = `${snapshot.height}px`;
        image.style.objectFit = "contain";
      });
    },
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageHeight = Math.round(canvas.width * (297 / 210));
  let sourceY = 0;
  let page = 0;

  while (sourceY < canvas.height) {
    if (canvas.height - sourceY <= 2) break;
    const sliceHeight = Math.min(pageHeight, canvas.height - sourceY);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const context = slice.getContext("2d");
    if (!context) throw new Error("Le document PDF n’a pas pu être préparé.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, 210, (sliceHeight / canvas.width) * 210, undefined, "FAST");
    sourceY += sliceHeight;
    page += 1;
  }

  const blobUrl = URL.createObjectURL(pdf.output("blob"));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
