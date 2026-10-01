"use client";
import { type ReactNode, useState } from "react";
import { FileText, Mails, Settings, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "@/components/error-banner";
import { SettingsDialog } from "@/components/settings-dialog";
import { useWorkspace } from "@/components/workspace";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/clients", label: "Clients", icon: UsersRound },
  { href: "/factures", label: "Factures", icon: FileText },
  { href: "/courriers", label: "Courriers", icon: Mails },
];
const tw = {
  appShell: "flex min-h-screen",
  sidebar: "flex w-[238px] shrink-0 flex-col bg-[#17364b] px-5 py-7 text-white max-[1050px]:w-[190px] max-[700px]:hidden print:hidden",
  brand: "flex items-center whitespace-nowrap px-2 text-xl font-bold tracking-[-0.05em] [&_img]:h-auto [&_img]:w-[185px]",
  sideLabel: "mx-3 mt-16 mb-4 text-xs font-bold tracking-[0.1em] text-[#88aab4]",
  navButton: "flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3.5 py-3.5 text-left font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-[18px]",
  sideBottom: "border-t border-[#345569] px-3 py-5 text-sm leading-6 text-[#a7c1c9]",
  main: "min-w-0 flex-1",
  topbar: "flex h-[75px] items-center justify-end border-b bg-card px-[4.5%] text-sm text-muted-foreground max-[700px]:h-[62px] max-[700px]:justify-between",
  mobileBrand: "hidden font-extrabold tracking-tight text-foreground max-[700px]:block",
  content: "mx-auto max-w-[1320px] px-[4.5%] py-11 max-[1050px]:px-[3%] max-[700px]:px-4 max-[700px]:py-7",
} as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { company, setCompany, error, setError } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return <div className={tw.appShell}>
<aside className={tw.sidebar}>
<div className={tw.brand}>
<Image src="/logo-web-white.svg" alt="RD Gestion & Services" width={185} height={36} priority/>
</div>
<div className={tw.sideLabel}>ESPACE DE TRAVAIL</div>
<nav aria-label="Navigation principale" className="grid gap-1.5">
{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn(tw.navButton, isActive(href) && "bg-white/10 text-white")} onClick={() => setError("")}>
<Icon/> {label}</Link>)}
</nav>
<button className={cn(tw.navButton, "mt-auto mb-3", settingsOpen && "bg-white/10 text-white")} onClick={() => setSettingsOpen(true)}>
<Settings/> Réglages</button>
<div className={tw.sideBottom}>Factures, clients et courriers réunis dans un même espace.</div>
</aside>
<main className={tw.main}>
<header className={tw.topbar}>
<div className={tw.mobileBrand}>RD Gestion & Services</div>
<span className="max-[700px]:text-xs">Votre espace de facturation <b className="ml-4 font-semibold text-ring max-[700px]:ml-1">● Privé</b> <button className="ml-4 border-0 bg-transparent text-[13px] text-foreground underline" onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}>Déconnexion</button>
</span>
</header>
<nav aria-label="Navigation mobile" className="hidden gap-1 border-b bg-card px-4 py-2 max-[700px]:flex print:hidden">
{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-muted-foreground [&_svg]:size-4", isActive(href) && "bg-accent text-foreground")} onClick={() => setError("")}>
<Icon/> {label}</Link>)}
<button aria-label="Réglages" className="grid place-items-center rounded-lg border-0 bg-transparent px-3 text-muted-foreground [&_svg]:size-4" onClick={() => setSettingsOpen(true)}><Settings/></button>
</nav>
<div className={tw.content}>
<ErrorBanner className="mb-6" message={error} onDismiss={() => setError("")}/>
{children}
</div>
</main>
<SettingsDialog open={settingsOpen} settings={company} onOpenChange={setSettingsOpen} onSaved={setCompany}/>
</div>;
}
