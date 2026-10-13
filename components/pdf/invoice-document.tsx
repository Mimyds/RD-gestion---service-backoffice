import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { assetUrl, pdfText } from "@/components/pdf/pdf-text";
import { DEFAULT_COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/dates";
import { type Invoice, money, subtotal, taxBreakdown, total } from "@/lib/invoices";
import { sirenFromSiret } from "@/lib/siret";

// Mirrors components/invoice-paper.tsx (screen preview); sizes are the preview's pixels × 0.75.
const blue = "#001B48";
const border = "#d2d2d2";
const columnWidths = ["14%", "30%", "8%", "17%", "10%", "21%"];
const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingHorizontal: 36, paddingBottom: 60, fontFamily: "Helvetica", color: blue },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  issuer: { width: "48%", color: blue },
  logo: { width: 214, height: 42, objectFit: "contain" },
  issuerDetails: { marginTop: 15 },
  issuerName: { fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase", marginBottom: 4.5 },
  issuerLine: { fontSize: 8.25, lineHeight: 1.4, marginVertical: 0.75 },
  client: { width: "42%", paddingLeft: 36, fontSize: 8.25, lineHeight: 1.4, textTransform: "uppercase" },
  clientName: { marginBottom: 4.5, fontFamily: "Helvetica-Bold", fontSize: 9.75 },
  clientLine: { marginVertical: 0.75 },
  title: { fontSize: 14.25, marginTop: 36, marginBottom: 24, letterSpacing: 0.15 },
  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 36, fontSize: 9, textTransform: "uppercase" },
  infoColumn: { width: "47%" },
  infoLine: { marginBottom: 9 },
  table: { borderLeftWidth: 0.75, borderTopWidth: 0.75, borderColor: border },
  row: { flexDirection: "row" },
  th: { flexGrow: 1, flexBasis: 0, backgroundColor: "#0c4d74", color: "#ffffff", fontSize: 7.5, textTransform: "uppercase", textAlign: "center", paddingVertical: 7.5, paddingHorizontal: 4, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: border },
  td: { flexGrow: 1, flexBasis: 0, minHeight: 60, fontSize: 7.5, lineHeight: 1.35, paddingVertical: 7.5, paddingHorizontal: 4, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: border },
  summary: { flexDirection: "row", marginTop: 12, alignItems: "flex-start" },
  bank: { width: "41%", paddingTop: 6, paddingLeft: 6, paddingRight: 10.5, fontSize: 8.25, lineHeight: 1.45, color: blue },
  bankTitle: { fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  totals: { width: "59%", borderTopWidth: 0.75, borderColor: border },
  totalRow: { flexDirection: "row", justifyContent: "space-between", minHeight: 24, paddingVertical: 6, paddingHorizontal: 7.5, fontSize: 9, textTransform: "uppercase", borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: border },
  strong: { fontFamily: "Helvetica-Bold" },
  notes: { marginVertical: 42, fontSize: 8.25, lineHeight: 1.4 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 24, borderTopWidth: 0.75, borderColor: "#6d9ab6", paddingTop: 6, fontSize: 6, lineHeight: 1.35, textAlign: "center", textTransform: "uppercase" },
});

export function InvoiceDocument({ invoice, issuerCity }: { invoice: Invoice; issuerCity: string }) {
  const currency = invoice.currency;
  return <Document title={`Facture ${invoice.number}`} author={invoice.issuer} language="fr">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.issuer}>
          <Image src={assetUrl("/rd-logo.png")} style={styles.logo}/>
          <View style={styles.issuerDetails}>
            <Text style={styles.issuerName}>{pdfText(invoice.issuer)}</Text>
            <Text style={styles.issuerLine}>{pdfText(invoice.issuerAddress)}</Text>
            <Text style={styles.issuerLine}>{pdfText(invoice.issuerDetails)}</Text>
            <Text style={styles.issuerLine}>{pdfText(invoice.issuerSiret ? `SIREN : ${sirenFromSiret(invoice.issuerSiret)}\nSIRET : ${invoice.issuerSiret}${invoice.issuerVatNumber ? `\nN° TVA : ${invoice.issuerVatNumber}` : ""}` : "SIRET non renseigné")}</Text>
          </View>
        </View>
        <View style={styles.client}>
          <Text style={styles.clientName}>{pdfText(invoice.client)}</Text>
          <Text style={styles.clientLine}>{pdfText(invoice.clientAddress)}</Text>
          <Text style={styles.clientLine}>{pdfText(invoice.clientEmail)}</Text>
          {invoice.clientSiret ? <Text style={styles.clientLine}>{pdfText(`SIREN : ${sirenFromSiret(invoice.clientSiret)}\nSIRET : ${invoice.clientSiret}${invoice.clientVatNumber ? `\nN° TVA : ${invoice.clientVatNumber}` : ""}`)}</Text> : null}
          {invoice.deliveryAddress ? <Text style={styles.clientLine}>{pdfText(`Adresse de livraison :\n${invoice.deliveryAddress}`)}</Text> : null}
        </View>
      </View>

      <Text style={styles.title}>FACTURE N° {pdfText(invoice.number)}</Text>

      <View style={styles.info}>
        <View style={styles.infoColumn}>
          <Text style={styles.infoLine}>{pdfText(issuerCity) || "Ville non renseignée"}, le {formatDate(invoice.issueDate)}</Text>
        </View>
        <View style={styles.infoColumn}>
          <Text style={styles.infoLine}>Suivi par : {pdfText(invoice.followedBy) || "—"}</Text>
          <Text style={styles.infoLine}>Pour : {pdfText(invoice.purpose) || "PRESTATION DE SERVICE"}</Text>
          {invoice.purchaseOrderNumber ? <Text style={styles.infoLine}>Bon de commande : {pdfText(invoice.purchaseOrderNumber)}</Text> : null}
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.row} fixed>
          {["Période", "Description", "Qté", "PU HT", "TVA", "Total HT"].map((label, index) => <Text key={label} style={[styles.th, { flexGrow: 0, flexBasis: "auto", width: columnWidths[index] }]}>{label}</Text>)}
        </View>
        {invoice.lines.map((line, index) => <View key={index} style={styles.row} wrap={false}>
          <Text style={[styles.td, { flexGrow: 0, flexBasis: "auto", width: columnWidths[0] }]}>{pdfText(line.period) || "—"}</Text>
          <Text style={[styles.td, { flexGrow: 0, flexBasis: "auto", width: columnWidths[1] }]}>{pdfText(line.description)}</Text>
          <Text style={[styles.td, { flexGrow: 0, flexBasis: "auto", width: columnWidths[2] }]}>{line.quantity}</Text>
          <Text style={[styles.td, { flexGrow: 0, flexBasis: "auto", width: columnWidths[3] }]}>{pdfText(money(line.unitPrice, currency))}</Text>
          <Text style={[styles.td, { flexGrow: 0, flexBasis: "auto", width: columnWidths[4] }]}>{line.taxRate} %</Text>
          <Text style={[styles.td, { flexGrow: 0, flexBasis: "auto", width: columnWidths[5] }]}>{pdfText(money(line.quantity * line.unitPrice, currency))}</Text>
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
          {taxBreakdown(invoice).map(([rate, amounts]) => <View style={[styles.totalRow, { fontSize: 7.5, textTransform: "none" }]} key={rate}><Text>Base {rate} % : {pdfText(money(amounts.taxable, currency))}</Text><Text>TVA : {pdfText(money(amounts.tax, currency))}</Text></View>)}
          <View style={styles.totalRow}><Text>Autres coûts</Text><Text style={styles.strong}>{pdfText(money(0, currency))}</Text></View>
          <View style={[styles.totalRow, { fontSize: 10.5, color: blue }]}><Text>Total TTC</Text><Text style={styles.strong}>{pdfText(money(total(invoice), currency))}</Text></View>
          <View style={[styles.totalRow, { fontSize: 8.25 }]}><Text>Échéance paiement</Text><Text style={styles.strong}>{formatDate(invoice.dueDate)}</Text></View>
        </View>
      </View>

      <Text style={styles.notes}>{pdfText(invoice.notes || DEFAULT_COMPANY.legalMentions)}</Text>

      <Text style={styles.footer} fixed>{pdfText(invoice.footer || DEFAULT_COMPANY.footer)}</Text>
    </Page>
  </Document>;
}
