import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/server";

// Shared by /clients, /factures and /courriers: navigation, settings and data loaded once across sections.
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";

  return <WorkspaceProvider><WorkspaceShell userEmail={email}>{children}</WorkspaceShell></WorkspaceProvider>;
}
