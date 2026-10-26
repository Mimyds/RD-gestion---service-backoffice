"use client";
import { LegalNumberInput } from "@/components/legal-number-input";
import { isValidSiret } from "@/lib/siret";
import { isValidFrenchVatNumber } from "@/lib/vat-number";
export type ClientDraft = { type: "entreprise" | "particulier"; companyName: string; firstName: string; lastName: string; email: string; phone: string; addressLine1: string; addressLine2: string; postalCode: string; city: string; country: string; siret: string; vatNumber: string };
type AddressDraft = Pick<ClientDraft, "addressLine1" | "addressLine2" | "postalCode" | "city" | "country">;
export const blankClient = (): ClientDraft => ({ type: "entreprise", companyName: "", firstName: "", lastName: "", email: "", phone: "", addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "France", siret: "", vatNumber: "" });
export const clientDraftName = (client: ClientDraft) => client.type === "entreprise" ? client.companyName.trim() : [client.firstName, client.lastName].map(value => value.trim()).filter(Boolean).join(" ");
const serializeAddress = (address: AddressDraft) => [address.addressLine1, address.addressLine2, [address.postalCode, address.city].filter(Boolean).join(" "), address.country].map(value => value.trim()).filter(Boolean).join("\n");
export const clientDraftAddress = (client: ClientDraft) => serializeAddress(client);

export function validateClientDraft(draft: ClientDraft) {
  const errors: Record<string, string> = {};
  if (!clientDraftName(draft)) errors[draft.type === "entreprise" ? "clientDraft.companyName" : "clientDraft.firstName"] = "Le nom du client est requis.";
  if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email)) errors["clientDraft.email"] = "Saisissez une adresse e-mail valide.";
  if (draft.type === "entreprise" && draft.siret && !isValidSiret(draft.siret)) errors["clientDraft.siret"] = "Le SIRET doit comporter 14 chiffres et être valide.";
  if (draft.type === "entreprise" && draft.vatNumber && !isValidFrenchVatNumber(draft.vatNumber)) errors["clientDraft.vatNumber"] = "Le numéro de TVA doit comporter FR suivi de 11 chiffres valides.";
  return errors;
}
function ValidationError({ message }: { message?: string }) { return message ? <span role="alert" className="text-sm font-normal text-destructive">{message}</span> : null; }
export function InlineClientForm({ clientDraft, clientField, fieldErrors }: {
  clientDraft: ClientDraft;
  clientField: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
  fieldErrors: Record<string, string>;
}) { return (<div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2.5 [&_select]:rounded-lg [&_select]:border [&_select]:bg-background [&_select]:p-2.5">
<label>Type de client<select value={clientDraft.type} onChange={e => clientField("type", e.target.value as ClientDraft["type"])}><option value="entreprise">Entreprise</option><option value="particulier">Particulier</option></select></label>
{clientDraft.type === "entreprise" ? <label>Raison sociale<input aria-invalid={Boolean(fieldErrors["clientDraft.companyName"]) || undefined} value={clientDraft.companyName} onChange={e => clientField("companyName", e.target.value)} placeholder="Nom de l’entreprise"/><ValidationError message={fieldErrors["clientDraft.companyName"]}/></label> : <><label>Prénom<input aria-invalid={Boolean(fieldErrors["clientDraft.firstName"]) || undefined} value={clientDraft.firstName} onChange={e => clientField("firstName", e.target.value)} placeholder="Prénom"/><ValidationError message={fieldErrors["clientDraft.firstName"]}/></label><label>Nom<input aria-invalid={Boolean(fieldErrors["clientDraft.lastName"]) || undefined} value={clientDraft.lastName} onChange={e => clientField("lastName", e.target.value)} placeholder="Nom"/><ValidationError message={fieldErrors["clientDraft.lastName"]}/></label></>}
<label>Adresse<input aria-invalid={Boolean(fieldErrors["clientDraft.addressLine1"]) || undefined} value={clientDraft.addressLine1} onChange={e => clientField("addressLine1", e.target.value)} placeholder="Numéro et voie"/><ValidationError message={fieldErrors["clientDraft.addressLine1"]}/></label>
<label>Complément d’adresse<input value={clientDraft.addressLine2} onChange={e => clientField("addressLine2", e.target.value)} placeholder="Bâtiment, étage…"/></label>
<label>Code postal<input value={clientDraft.postalCode} onChange={e => clientField("postalCode", e.target.value)} placeholder="69000"/></label>
<label>Ville<input value={clientDraft.city} onChange={e => clientField("city", e.target.value)} placeholder="Lyon"/></label>
<label>Pays<input value={clientDraft.country} onChange={e => clientField("country", e.target.value)} placeholder="France"/></label>
<label>E-mail<input aria-invalid={Boolean(fieldErrors["clientDraft.email"]) || undefined} type="email" value={clientDraft.email} onChange={e => clientField("email", e.target.value)} placeholder="client@exemple.fr"/><ValidationError message={fieldErrors["clientDraft.email"]}/></label>
<label>Téléphone<input type="tel" value={clientDraft.phone} onChange={e => clientField("phone", e.target.value)} placeholder="+33…"/></label>
{clientDraft.type === "entreprise" && <label>SIRET<LegalNumberInput kind="siret" aria-invalid={Boolean(fieldErrors["clientDraft.siret"]) || undefined} value={clientDraft.siret} onValueChange={value => clientField("siret", value)}/><ValidationError message={fieldErrors["clientDraft.siret"]}/></label>}
{clientDraft.type === "entreprise" && <label>N° de TVA intracommunautaire<LegalNumberInput kind="vat" aria-invalid={Boolean(fieldErrors["clientDraft.vatNumber"]) || undefined} value={clientDraft.vatNumber} onValueChange={value => clientField("vatNumber", value)}/><ValidationError message={fieldErrors["clientDraft.vatNumber"]}/></label>}
</div>); }
