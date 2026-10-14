import type { Metadata } from "next";
import { InvoicesView } from "@/components/workspace-views";

export const metadata: Metadata = { title: "Factures" };

export default function InvoicesPage() {
  return <InvoicesView/>;
}
