import Image from "next/image";
import { DEFAULT_COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/dates";
import { type Invoice, money, subtotal, taxBreakdown, total } from "@/lib/invoices";
import { cn } from "@/lib/utils";
import { sirenFromSiret } from "@/lib/siret";

const paper = "relative flex min-h-[1040px] flex-col border bg-white px-12 pt-14 pb-8 font-sans text-[#001B48] shadow-lg";

export function InvoicePaper({ invoice, issuerCity }: { invoice: Invoice; issuerCity: string }) {
  return <div className={cn(paper, "w-[794px]")}>
<div className="grid grid-cols-[48%_44%] items-start justify-between gap-10">
<div>
<Image src="/logo-web.svg" alt="RD Gestion & Services" width={285} height={56} priority className="h-[56px] w-[285px] max-w-full object-contain object-left-top"/>
<div className="mt-5 text-[#001B48] [&_p]:my-1 [&_p]:whitespace-pre-line [&_p]:text-[11px] [&_p]:leading-[1.4] [&_strong]:mb-1.5 [&_strong]:block [&_strong]:text-xs [&_strong]:uppercase">
<strong>{invoice.issuer}</strong>
<p>{invoice.issuerAddress}</p>
<p>{invoice.issuerDetails}</p>
<p>{invoice.issuerSiret ? `SIREN : ${sirenFromSiret(invoice.issuerSiret)}\nSIRET : ${invoice.issuerSiret}` : "SIRET non renseigné"}{invoice.issuerVatNumber ? `\nN° TVA : ${invoice.issuerVatNumber}` : ""}</p>
</div>
</div>
<div className="pl-14 uppercase [&_p]:my-1 [&_p]:whitespace-pre-line [&_p]:text-[11px] [&_p]:leading-[1.4] [&_strong]:mb-2 [&_strong]:block [&_strong]:text-[13px]">
<strong>{invoice.client}</strong>
<p>{invoice.clientAddress}</p>
<p>{invoice.clientEmail}</p>
{invoice.clientSiret ? <p>SIREN : {sirenFromSiret(invoice.clientSiret)}{"\n"}SIRET : {invoice.clientSiret}{invoice.clientVatNumber ? `\nN° TVA : ${invoice.clientVatNumber}` : ""}</p> : null}
{invoice.deliveryAddress ? <p>Adresse de livraison :{"\n"}{invoice.deliveryAddress}</p> : null}
</div>
</div>
<h2 className="mt-12 mb-8 text-[19px] font-normal tracking-[0.01em]">FACTURE N° {invoice.number}</h2>
<div className="mb-12 grid grid-cols-2 items-start gap-x-12 text-[12px] uppercase">
<div className="m-0 grid gap-3">
<span>{issuerCity || "Ville non renseignée"}, le {formatDate(invoice.issueDate)}</span>
</div>
<div className="m-0 grid gap-3">
<span>SUIVI PAR : {invoice.followedBy || "—"}</span>
<span>POUR : {invoice.purpose || "PRESTATION DE SERVICE"}</span>
{invoice.purchaseOrderNumber ? <span>BON DE COMMANDE : {invoice.purchaseOrderNumber}</span> : null}
</div>
</div>
<table className="w-full table-fixed border-collapse text-left [&_th]:border [&_th]:border-[#d2d2d2] [&_th]:bg-[#0c4d74] [&_th]:px-2 [&_th]:py-2.5 [&_th]:text-center [&_th]:text-[10px] [&_th]:font-normal [&_th]:text-white [&_th]:uppercase [&_th:nth-child(1)]:w-[14%] [&_th:nth-child(2)]:w-[30%] [&_th:nth-child(3)]:w-[8%] [&_th:nth-child(4)]:w-[17%] [&_th:nth-child(5)]:w-[10%] [&_th:nth-child(6)]:w-[21%] [&_td]:h-20 [&_td]:border [&_td]:border-[#d2d2d2] [&_td]:px-2 [&_td]:py-2.5 [&_td]:text-[10px] [&_td]:leading-[1.35] [&_td]:align-top">
<thead>
<tr>
<th>Période</th><th>Description</th><th>Qté</th><th>PU HT</th><th>TVA</th><th>Total HT</th>
</tr>
</thead>
<tbody>{invoice.lines.map((l, n) => <tr key={n}>
<td>{l.period || "—"}</td>
<td>{l.description}</td>
<td>{l.quantity}</td>
<td>{money(l.unitPrice, invoice.currency)}</td>
<td>{l.taxRate} %</td>
<td>{money(l.quantity * l.unitPrice, invoice.currency)}</td>
</tr>)}</tbody>
</table>
<div className="mt-4 grid grid-cols-[41%_59%] items-start">
<div className="m-0 px-2 pt-2 pr-3.5 text-[11px] text-[#001B48] [&_p]:whitespace-pre-line [&_p]:text-[11px] [&_p]:leading-[1.45] [&_strong]:uppercase">
<strong>Coordonnées bancaires</strong>
<p>{invoice.bankDetails || DEFAULT_COMPANY.bankDetails}</p>
</div>
<div className="m-0 w-full [&>div]:flex [&>div]:min-h-8 [&>div]:justify-between [&>div]:border [&>div]:border-b-0 [&>div]:border-[#d2d2d2] [&>div]:px-2.5 [&>div]:py-2 [&>div]:text-xs [&>div]:uppercase [&>div:last-child]:border-b">
<div>
<span>Sous-total HT</span>
<strong>{money(subtotal(invoice), invoice.currency)}</strong>
</div>
<div>
<span>Total TVA</span>
<strong>{money(total(invoice) - subtotal(invoice), invoice.currency)}</strong>
</div>
{taxBreakdown(invoice).map(([rate, amounts]) => <div className="text-[10px]! normal-case!" key={rate}><span>Base {rate} % : {money(amounts.taxable, invoice.currency)}</span><strong>TVA : {money(amounts.tax, invoice.currency)}</strong></div>)}
<div>
<span>Autres coûts</span>
<strong>{money(0, invoice.currency)}</strong>
</div>
<div className="text-sm! text-[#001B48] [&_strong]:text-[#001B48]">
<span>Total TTC</span>
<strong>{money(total(invoice), invoice.currency)}</strong>
</div>
<div className="text-[11px]!">
<span>Échéance paiement</span>
<strong>{formatDate(invoice.dueDate)}</strong>
</div>
</div>
</div>
<div className="my-14 border-0 p-0">
<p className="text-[11px] leading-[1.4] whitespace-pre-line">{invoice.notes || DEFAULT_COMPANY.legalMentions}</p>
</div>
<div className="mt-auto border-t border-[#6d9ab6] pt-2 text-center text-[8px] leading-[1.35] uppercase whitespace-pre-line">{invoice.footer || DEFAULT_COMPANY.footer}</div>
</div>;
}
