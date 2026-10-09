import type { JSONContent } from "@tiptap/core";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { Letter } from "@/components/letter-manager";
import { assetUrl, pdfText } from "@/components/pdf/pdf-text";
import { type CompanySettings, companyDetails } from "@/lib/company";

// Mirrors LetterPaper in components/letter-manager.tsx; sizes are the preview's pixels × 0.75.
const documentText = "#001B48";
const styles = StyleSheet.create({
  page: { paddingVertical: 54, paddingHorizontal: 57, fontFamily: "Helvetica", fontSize: 11.25, lineHeight: 1.6, color: documentText },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 42 },
  logo: { width: 169, height: 33, objectFit: "contain", marginBottom: 12 },
  issuer: { fontSize: 9, lineHeight: 1.65, color: documentText },
  recipient: { maxWidth: 232, paddingTop: 48 },
  recipientName: { fontFamily: "Helvetica-Bold" },
  recipientAddress: { color: documentText },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 },
  bold: { fontFamily: "Helvetica-Bold" },
  subject: { fontFamily: "Helvetica-Bold", marginBottom: 24 },
  paragraph: { marginVertical: 6, minHeight: 12 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 15, marginVertical: 10 },
  list: { marginVertical: 6 },
  listItem: { flexDirection: "row", marginBottom: 3 },
  listParagraph: { minHeight: 12 },
  bullet: { width: 18 },
  listContent: { flex: 1 },
  quote: { borderLeftWidth: 3, borderColor: "#cbd5e1", paddingLeft: 12, marginVertical: 6, fontFamily: "Helvetica-Oblique" },
  code: { fontFamily: "Courier", fontSize: 9.75, backgroundColor: "#f1f5f9", padding: 8, marginVertical: 6 },
  rule: { borderTopWidth: 0.75, borderColor: "#cbd5e1", marginVertical: 18 },
});

const safeHref = (href: unknown) => typeof href === "string" && /^(https?:|mailto:|tel:)/i.test(href.trim()) ? href.trim() : undefined;

function fontFor(marks: JSONContent["marks"]) {
  const bold = marks?.some((mark) => mark.type === "bold");
  const italic = marks?.some((mark) => mark.type === "italic");
  if (marks?.some((mark) => mark.type === "code")) return bold ? "Courier-Bold" : "Courier";
  if (bold && italic) return "Helvetica-BoldOblique";
  if (bold) return "Helvetica-Bold";
  if (italic) return "Helvetica-Oblique";
  return undefined;
}

function inline(node: JSONContent, key: string): ReactNode {
  if (node.type === "hardBreak") return "\n";
  if (node.type !== "text") return (node.content || []).map((child, index) => inline(child, `${key}-${index}`));
  const underline = node.marks?.some((mark) => mark.type === "underline");
  const strike = node.marks?.some((mark) => mark.type === "strike");
  const textDecoration = underline && strike ? "underline line-through" : underline ? "underline" : strike ? "line-through" : undefined;
  const style = { fontFamily: fontFor(node.marks), textDecoration } as const;
  const href = safeHref(node.marks?.find((mark) => mark.type === "link")?.attrs?.href);
  const text = <Text key={key} style={style}>{pdfText(node.text)}</Text>;
  return href ? <Link key={key} src={href} style={{ color: documentText }}>{text}</Link> : text;
}

function block(node: JSONContent, key: string, index = 0, ordered = false, inList = false): ReactNode {
  const children = node.content || [];
  switch (node.type) {
    case "heading": return <Text key={key} style={styles.heading}>{children.map((child, i) => inline(child, `${key}-${i}`))}</Text>;
    case "bulletList":
    case "orderedList": return <View key={key} style={styles.list}>{children.map((child, i) => block(child, `${key}-${i}`, i, node.type === "orderedList"))}</View>;
    case "listItem": return <View key={key} style={styles.listItem} wrap={false}>
      <Text style={styles.bullet}>{ordered ? `${index + 1}.` : "•"}</Text>
      <View style={styles.listContent}>{children.map((child, i) => block(child, `${key}-${i}`, 0, false, true))}</View>
    </View>;
    case "blockquote": return <View key={key} style={styles.quote}>{children.map((child, i) => block(child, `${key}-${i}`))}</View>;
    case "codeBlock": return <Text key={key} style={styles.code}>{children.map((child) => pdfText(child.text)).join("")}</Text>;
    case "horizontalRule": return <View key={key} style={styles.rule}/>;
    default: return <Text key={key} style={inList ? styles.listParagraph : styles.paragraph}>{children.map((child, i) => inline(child, `${key}-${i}`))}</Text>;
  }
}

export function LetterDocument({ letter, company }: { letter: Letter; company: CompanySettings }) {
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${letter.date}T12:00:00`));
  return <Document title={letter.subject || "Courrier"} author={company.name} language="fr">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Image src={assetUrl("/rd-logo.png")} style={styles.logo}/>
          <Text style={styles.issuer}>{pdfText(company.address)}{"\n"}{pdfText(companyDetails(company))}</Text>
        </View>
        <View style={styles.recipient}>
          <Text style={styles.recipientName}>{pdfText(letter.recipient) || "Destinataire"}</Text>
          <Text style={styles.recipientAddress}>{pdfText(letter.recipientAddress) || "Adresse du destinataire"}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text>{letter.reference ? <><Text style={styles.bold}>Référence : </Text>{pdfText(letter.reference)}</> : ""}</Text>
        <Text>{pdfText(company.letterCity)}, le {pdfText(date)}</Text>
      </View>
      <Text style={styles.subject}>Objet : {pdfText(letter.subject) || "Objet du courrier"}</Text>
      <View>{(letter.content?.content || []).map((node, index) => block(node, `block-${index}`))}</View>
    </Page>
  </Document>;
}
