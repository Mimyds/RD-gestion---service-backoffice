import { Font } from "@react-pdf/renderer";

// French text must not be cut with the renderer's default (English) hyphenation rules.
Font.registerHyphenationCallback((word) => [word]);

// The built-in PDF fonts (Helvetica, Courier) only cover WinAnsi characters: map the French typographic spaces
// produced by Intl (thin and narrow no-break spaces) to a regular no-break space so amounts render correctly.
export const pdfText = (value: string | null | undefined) => (value || "").replace(/[\u2009\u202f]/g, "\u00a0");

export const assetUrl = (path: string) => `${window.location.origin}${path}`;
