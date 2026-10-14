import type { Metadata } from "next";
import { ClientsView } from "@/components/workspace-views";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return <ClientsView/>;
}
