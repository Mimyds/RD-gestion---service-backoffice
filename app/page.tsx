"use client";
import { useCallback, useEffect, useState } from "react";
import { FileText, Mails, UsersRound } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ClientManager, type ClientRecord } from "@/components/client-manager";
import { ErrorBanner } from "@/components/error-banner";
import { InvoiceManager } from "@/components/invoice-manager";
import { LetterManager } from "@/components/letter-manager";
import { cn } from "@/lib/utils";

type View = "invoices" | "letters" | "clients";
const navigation: { view: View; label: string; icon: typeof FileText }[] = [
  { view: "invoices", label: "Factures", icon: FileText },
  { view: "letters", label: "Courriers", icon: Mails },
  { view: "clients", label: "Clients", icon: UsersRound },
];
const tw = {
  appShell: "flex min-h-screen",
  sidebar: "flex w-[238px] shrink-0 flex-col bg-[#17364b] px-5 py-7 text-white max-[1050px]:w-[190px] max-[700px]:hidden print:hidden",
  brand: "flex items-center whitespace-nowrap px-2 text-xl font-bold tracking-[-0.05em] [&_img]:h-auto [&_img]:w-[185px]",
  sideLabel: "mx-3 mt-16 mb-4 text-xs font-bold tracking-[0.1em] text-[#88aab4]",
  navButton: "flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3.5 py-3.5 text-left font-semibold text-white/70 transition-colors not-first:mt-1.5 hover:bg-white/10 hover:text-white [&_svg]:size-[18px]",
  sideBottom: "mt-auto border-t border-[#345569] px-3 py-5 text-sm leading-6 text-[#a7c1c9]",
  main: "min-w-0 flex-1",
  topbar: "flex h-[75px] items-center justify-end border-b bg-card px-[4.5%] text-sm text-muted-foreground max-[700px]:h-[62px] max-[700px]:justify-between",
  mobileBrand: "hidden font-extrabold tracking-tight text-foreground max-[700px]:block",
  content: "mx-auto max-w-[1320px] px-[4.5%] py-11 max-[1050px]:px-[3%] max-[700px]:px-4 max-[700px]:py-7",
} as const;

export default function Home() {
  const [clients, setClients] = useState<ClientRecord[]>([]), [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("invoices");

  const refreshClients = useCallback(async () => { try { const response = await fetch("/api/clients"); const data = await response.json(); if (!response.ok) throw Error(data.error); setClients(data.clients); } catch { setError("Impossible de charger vos clients. Réessayez dans un instant."); } finally { setClientsLoading(false); } }, []);
  useEffect(() => { void refreshClients(); }, [refreshClients]);

  function navigate(next: View) { setError(""); setView(next); }

  return <div className={tw.appShell}>
<aside className={tw.sidebar}>
<div className={tw.brand}>
<Image src="/logo-web-white.svg" alt="RD Gestion & Services" width={185} height={36} priority/>
</div>
<div className={tw.sideLabel}>ESPACE DE TRAVAIL</div>
{navigation.map(({ view: target, label, icon: Icon }) => <button key={target} aria-current={view === target ? "page" : undefined} className={cn(tw.navButton, view === target && "bg-white/10 text-white")} onClick={() => navigate(target)}>
<Icon/> {label}</button>)}
<div className={tw.sideBottom}>Factures, clients et courriers réunis dans un même espace.</div>
</aside>
<main className={tw.main}>
<header className={tw.topbar}>
<div className={tw.mobileBrand}>RD Gestion & Services</div>
<span className="max-[700px]:text-xs">Votre espace de facturation <b className="ml-4 font-semibold text-ring max-[700px]:ml-1">● Privé</b> <button className="ml-4 border-0 bg-transparent text-[13px] text-foreground underline" onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}>Déconnexion</button>
</span>
</header>
<nav aria-label="Navigation principale" className="hidden gap-1 border-b bg-card px-4 py-2 max-[700px]:flex print:hidden">
{navigation.map(({ view: target, label, icon: Icon }) => <button key={target} aria-current={view === target ? "page" : undefined} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg border-0 bg-transparent px-2 py-2 text-sm font-semibold text-muted-foreground [&_svg]:size-4", view === target && "bg-accent text-foreground")} onClick={() => navigate(target)}>
<Icon/> {label}</button>)}
</nav>
<div className={tw.content}>
<ErrorBanner className="mb-6" message={error} onDismiss={() => setError("")}/>
{view === "clients" ? <ClientManager clients={clients} loading={clientsLoading} error={error} onChanged={refreshClients} onError={setError}/> : view === "letters" ? <LetterManager clients={clients} error={error} onError={setError}/> : <InvoiceManager clients={clients} error={error} onError={setError} onClientsChanged={refreshClients}/>}
</div>
</main>
</div>;
}
