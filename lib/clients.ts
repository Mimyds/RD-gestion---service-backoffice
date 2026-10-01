import type { ClientRecord } from "@/components/client-manager";

export const clientName = (client: ClientRecord) => client.type === "entreprise"
  ? client.company_name || ""
  : [client.first_name, client.last_name].filter(Boolean).join(" ");

export const clientAddress = (client: ClientRecord) => [
  client.address_line1,
  client.address_line2,
  [client.postal_code, client.city].filter(Boolean).join(" "),
  client.country,
].filter(Boolean).join("\n");
