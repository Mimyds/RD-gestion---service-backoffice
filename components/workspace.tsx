"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ClientRecord } from "@/components/client-manager";
import { type CompanySettings, DEFAULT_COMPANY } from "@/lib/company";
import { apiFetch } from "@/lib/http";

// Data shared by the Clients, Factures and Courriers routes, loaded once by the workspace layout.
type Workspace = {
  clients: ClientRecord[];
  clientsLoading: boolean;
  refreshClients: () => Promise<void>;
  company: CompanySettings;
  setCompany: (company: CompanySettings) => void;
  error: string;
  setError: (message: string) => void;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientRecord[]>([]), [clientsLoading, setClientsLoading] = useState(true);
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [error, setError] = useState("");

  const refreshClients = useCallback(async () => { try { const response = await apiFetch("/api/clients"); const data = await response.json(); if (!response.ok) throw Error(data.error); setClients(data.clients); } catch { setError("Impossible de charger vos clients. Réessayez dans un instant."); } finally { setClientsLoading(false); } }, []);
  useEffect(() => { void refreshClients(); }, [refreshClients]);
  useEffect(() => { void (async () => { try { const response = await apiFetch("/api/settings"); const data = await response.json(); if (!response.ok) throw Error(data.error); setCompany(data.settings); } catch { setError("Impossible de charger les réglages de l’entreprise. Les valeurs par défaut sont affichées."); } })(); }, []);

  const value = useMemo(() => ({ clients, clientsLoading, refreshClients, company, setCompany, error, setError }), [clients, clientsLoading, refreshClients, company, error]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return workspace;
}
