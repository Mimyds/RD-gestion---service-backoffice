"use client";
import { ClientManager } from "@/components/client-manager";
import { InvoiceManager } from "@/components/invoice-manager";
import { LetterManager } from "@/components/letter-manager";
import { useWorkspace } from "@/components/workspace";

// Client-side entry points of the workspace routes, wired to the shared workspace data.
export function ClientsView() {
  const { clients, clientsLoading, refreshClients, error, setError } = useWorkspace();
  return <ClientManager clients={clients} loading={clientsLoading} error={error} onChanged={refreshClients} onError={setError}/>;
}

export function InvoicesView() {
  const { clients, company, refreshClients, error, setError } = useWorkspace();
  return <InvoiceManager clients={clients} company={company} error={error} onError={setError} onClientsChanged={refreshClients}/>;
}

export function LettersView() {
  const { clients, company, error, setError } = useWorkspace();
  return <LetterManager clients={clients} company={company} error={error} onError={setError}/>;
}
