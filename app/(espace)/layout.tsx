import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace";
import { WorkspaceShell } from "@/components/workspace-shell";

// Shared by /clients, /factures and /courriers: navigation, settings and data loaded once across sections.
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceProvider><WorkspaceShell>{children}</WorkspaceShell></WorkspaceProvider>;
}
