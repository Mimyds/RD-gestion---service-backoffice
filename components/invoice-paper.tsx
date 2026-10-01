import Image from "next/image";
import { DEFAULT_COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/dates";
import { type Invoice, lineTotal, money, subtotal, total } from "@/lib/invoices";
import { cn } from "@/lib/utils";

const paper = "relative flex min-h-[1040px] flex-col border bg-white px-12 pt-14 pb-8 font-sans text-[#0d4d75] shadow-lg";

export function InvoicePaper({ invoice }: { invoice: Invoice }) {
  return <div className={cn(paper, "w-[794px]")}>
<div className="flex items-start justify-between gap-6">
<div className="w-[48%]">
<Image src="/logo-web.svg" alt="RD Gestion & Services" width={285} height={56} priority className="h-[56px] w-[285px] max-w-full object-contain object-left-top"/>
</div>
<div className="w-[42%] text-[#202945] [&_p]:my-1 [&_p]:whitespace-pre-line [&_p]:text-xs [&_p]:font-semibold [&_p]:leading-[1.35] [&_strong]:mb-1.5 [&_strong]:block [&_strong]:text-[13px] [&_strong]:uppercase">
<strong>{invoice.issuer}</strong>
<p>{invoice.issuerAddress}</p>
<p>{invoice.issuerDetails}</p>
</div>
</div>
<h2 className="my-9 mt-20 text-[22px] font-normal tracking-[0.01em]">FACTURE N° {invoice.number}</h2>
<div className="mb-12 grid grid-cols-[1fr_44%] items-start gap-10">
<div className="m-0 grid gap-4 text-[13px] uppercase">
<span>Émise le : {formatDate(invoice.issueDate)}</span>
<span>SUIVI PAR : {invoice.followedBy || "—"}</span>
<span>POUR : {invoice.purpose || "PRESTATION DE SERVICE"}</span>
</div>
<div className="m-0 uppercase [&_p]:my-1 [&_p]:whitespace-pre-line [&_p]:text-[13px] [&_strong]:text-[13px] [&_strong]:font-normal">
<strong>{invoice.client}</strong>
<p>{invoice.clientAddress}</p>
<p>{invoice.clientEmail}</p>
</div>
</div>
<table className="w-full table-fixed border-collapse text-left [&_th]:border [&_th]:border-[#d2d2d2] [&_th]:bg-[#0c4d74] [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-center [&_th]:text-xs [&_th]:font-normal [&_th]:text-white [&_th]:uppercase [&_td]:h-20 [&_td]:border [&_td]:border-[#d2d2d2] [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-xs [&_td]:leading-[1.35] [&_td]:align-top">
<thead>
<tr>
<th>Période</th>
<th>Description</th>
<th>Prix unitaire</th>
<th>Total</th>
</tr>
</thead>
<tbody>{invoice.lines.map((l, n) => <tr key={n}>
<td>{l.period || "—"}</td>
<td>{l.description}</td>
<td>{l.quantity !== 1 ? `${l.quantity} × ` : ""}{money(l.unitPrice, invoice.currency)}</td>
<td>{money(lineTotal(l), invoice.currency)}</td>
</tr>)}</tbody>
</table>
<div className="mt-4 grid grid-cols-[41%_59%] items-start">
<div className="m-0 px-2 pt-2 pr-3.5 text-[11px] text-[#315d79] [&_p]:whitespace-pre-line [&_p]:text-[11px] [&_p]:leading-[1.45] [&_strong]:uppercase">
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
<div>
<span>Autres coûts</span>
<strong>{money(0, invoice.currency)}</strong>
</div>
<div className="text-sm! text-[#e9853e] [&_strong]:text-[#0d4d75]">
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
