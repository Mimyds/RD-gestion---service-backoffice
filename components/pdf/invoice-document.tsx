import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { assetUrl, pdfText } from "@/components/pdf/pdf-text";
import { DEFAULT_COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/dates";
import { type Invoice, lineTotal, money, subtotal, total } from "@/lib/invoices";

// Mirrors components/invoice-paper.tsx (screen preview); sizes are the preview's pixels × 0.75.
const blue = "#0d4d75";
const border = "#d2d2d2";
const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingHorizontal: 36, paddingBottom: 60, fontFamily: "Helvetica", color: blue },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 214, height: 42, objectFit: "contain" },
  issuer: { width: "42%", color: "#202945" },
  issuerName: { fontFamily: "Helvetica-Bold", fontSize: 9.75, textTransform: "uppercase", marginBottom: 4.5 },
  issuerLine: { fontFamily: "Helvetica-Bold", fontSize: 9, lineHeight: 1.35, marginVertical: 0.75 },
  title: { fontSize: 16.5, marginTop: 60, marginBottom: 27, letterSpacing: 0.15 },
  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 36 },
  infoLeft: { flexGrow: 1, fontSize: 9.75, textTransform: "uppercase" },
  infoLine: { marginBottom: 12 },
  client: { width: "44%", fontSize: 9.75, textTransform: "uppercase" },
  clientLine: { marginVertical: 0.75 },
  table: { borderLeftWidth: 0.75, borderTopWidth: 0.75, borderColor: border },
  row: { flexDirection: "row" },
  th: { width: "25%", backgroundColor: "#0c4d74", color: "#ffffff", fontSize: 9, textTransform: "uppercase", textAlign: "center", paddingVertical: 7.5, paddingHorizontal: 9, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: border },
  td: { width: "25%", minHeight: 60, fontSize: 9, lineHeight: 1.35, paddingVertical: 7.5, paddingHorizontal: 9, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: border },
  summary: { flexDirection: "row", marginTop: 12, alignItems: "flex-start" },
  bank: { width: "41%", paddingTop: 6, paddingLeft: 6, paddingRight: 10.5, fontSize: 8.25, lineHeight: 1.45, color: "#315d79" },
  bankTitle: { fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  totals: { width: "59%", borderTopWidth: 0.75, borderColor: border },
  totalRow: { flexDirection: "row", justifyContent: "space-between", minHeight: 24, paddingVertical: 6, paddingHorizontal: 7.5, fontSize: 9, textTransform: "uppercase", borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: border },
  strong: { fontFamily: "Helvetica-Bold" },
  notes: { marginVertical: 42, fontSize: 8.25, lineHeight: 1.4 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 24, borderTopWidth: 0.75, borderColor: "#6d9ab6", paddingTop: 6, fontSize: 6, lineHeight: 1.35, textAlign: "center", textTransform: "uppercase" },
});

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const currency = invoice.currency;
  return <Document title={`Facture ${invoice.number}`} author={invoice.issuer} language="fr">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={assetUrl("/rd-logo.png")} style={styles.logo}/>
        <View style={styles.issuer}>
          <Text style={styles.issuerName}>{pdfText(invoice.issuer)}</Text>
          <Text style={styles.issuerLine}>{pdfText(invoice.issuerAddress)}</Text>
          <Text style={styles.issuerLine}>{pdfText(invoice.issuerDetails)}</Text>
        </View>
      </View>

      <Text style={styles.title}>FACTURE N° {pdfText(invoice.number)}</Text>

      <View style={styles.info}>
        <View style={styles.infoLeft}>
          <Text style={styles.infoLine}>Émise le : {formatDate(invoice.issueDate)}</Text>
          <Text style={styles.infoLine}>Suivi par : {pdfText(invoice.followedBy) || "—"}</Text>
          <Text style={styles.infoLine}>Pour : {pdfText(invoice.purpose) || "PRESTATION DE SERVICE"}</Text>
        </View>
        <View style={styles.client}>
          <Text style={styles.clientLine}>{pdfText(invoice.client)}</Text>
          <Text style={styles.clientLine}>{pdfText(invoice.clientAddress)}</Text>
          <Text style={styles.clientLine}>{pdfText(invoice.clientEmail)}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.row} fixed>
          {["Période", "Description", "Prix unitaire", "Total"].map((label) => <Text key={label} style={styles.th}>{label}</Text>)}
        </View>
        {invoice.lines.map((line, index) => <View key={index} style={styles.row} wrap={false}>
          <Text style={styles.td}>{pdfText(line.period) || "—"}</Text>
          <Text style={styles.td}>{pdfText(line.description)}</Text>
          <Text style={styles.td}>{pdfText(`${line.quantity !== 1 ? `${line.quantity} × ` : ""}${money(line.unitPrice, currency)}`)}</Text>
          <Text style={styles.td}>{pdfText(money(lineTotal(line), currency))}</Text>
        </View>)}
      </View>

      <View style={styles.summary} wrap={false}>
        <View style={styles.bank}>
          <Text style={styles.bankTitle}>Coordonnées bancaires</Text>
          <Text>{pdfText(invoice.bankDetails || DEFAULT_COMPANY.bankDetails)}</Text>
        </View>
        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Sous-total HT</Text><Text style={styles.strong}>{pdfText(money(subtotal(invoice), currency))}</Text></View>
          <View style={styles.totalRow}><Text>Total TVA</Text><Text style={styles.strong}>{pdfText(money(total(invoice) - subtotal(invoice), currency))}</Text></View>
          <View style={styles.totalRow}><Text>Autres coûts</Text><Text style={styles.strong}>{pdfText(money(0, currency))}</Text></View>
          <View style={[styles.totalRow, { fontSize: 10.5, color: "#e9853e" }]}><Text>Total TTC</Text><Text style={[styles.strong, { color: blue }]}>{pdfText(money(total(invoice), currency))}</Text></View>
          <View style={[styles.totalRow, { fontSize: 8.25 }]}><Text>Échéance paiement</Text><Text style={styles.strong}>{formatDate(invoice.dueDate)}</Text></View>
        </View>
      </View>

      <Text style={styles.notes}>{pdfText(invoice.notes || DEFAULT_COMPANY.legalMentions)}</Text>

      <Text style={styles.footer} fixed>{pdfText(invoice.footer || DEFAULT_COMPANY.footer)}</Text>
    </Page>
  </Document>;
}
