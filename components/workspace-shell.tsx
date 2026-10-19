"use client";
import { type ReactNode, useState } from "react";
import { FileText, LogOut, Mails, Settings, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "@/components/error-banner";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/components/workspace";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/clients", label: "Clients", icon: UsersRound },
  { href: "/factures", label: "Factures", icon: FileText },
  { href: "/courriers", label: "Courriers", icon: Mails },
];
const tw = {
  appShell: "min-h-screen",
  header: "sticky top-0 z-40 border-b border-border/80 bg-background/90 px-5 py-4 backdrop-blur-xl print:hidden max-sm:px-3 max-sm:py-3",
  headerInner: "mx-auto flex min-h-17 max-w-[1380px] items-center gap-8 rounded-2xl border bg-card px-5 shadow-[0_10px_35px_rgba(0,27,72,0.06)] max-md:flex-wrap max-md:gap-2 max-md:px-3 max-md:py-3",
  brand: "flex shrink-0 items-center [&_img]:h-auto [&_img]:w-[190px] max-sm:[&_img]:w-[154px]",
  nav: "mx-auto flex items-stretch gap-2 self-stretch max-md:order-3 max-md:w-full max-md:overflow-x-auto",
  navButton: "relative flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground max-sm:flex-1 max-sm:justify-center max-sm:px-3 [&_svg]:size-[17px]",
  main: "min-w-0",
  content: "mx-auto max-w-[1380px] px-8 py-12 max-lg:px-5 max-sm:px-4 max-sm:py-8",
} as const;

function AccountMenu({ email, onSettings, onError }: { email: string; onSettings: () => void; onError: (message: string) => void }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const initial = email.trim().charAt(0).toLocaleUpperCase("fr-FR") || "?";

  async function logOut() {
    setLoggingOut(true);
    onError("");
    const { error } = await createClient().auth.signOut();
    if (error) {
      onError("La déconnexion a échoué. Veuillez réessayer.");
      setLoggingOut(false);
      return;
    }
    window.location.assign("/login");
  }

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-11 shrink-0 rounded-xl px-3 text-foreground" aria-label={email ? `Compte ${email}` : "Compte"}>
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[#001B48] text-xs font-bold text-white">{initial}</span>
        <span className="max-sm:sr-only">Compte</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="bottom" align="end">
      <DropdownMenuItem onSelect={onSettings}><Settings/> Réglages</DropdownMenuItem>
      <DropdownMenuSeparator/>
      <DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={() => void logOut()}>
        <LogOut/> {loggingOut ? "Déconnexion…" : "Se déconnecter"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function WorkspaceShell({ children, userEmail }: { children: ReactNode; userEmail: string }) {
  const pathname = usePathname();
  const { company, setCompany, error, setError } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return <div className={tw.appShell}>
<header className={tw.header}>
<div className={tw.headerInner}>
<Link href="/factures" className={tw.brand} aria-label="Accueil RD Gestion & Services"><Image src="/logo-web.svg" alt="RD Gestion & Services" width={190} height={37} priority/></Link>
<nav aria-label="Navigation principale" className={tw.nav}>
{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn(tw.navButton, isActive(href) && "text-foreground after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary")} onClick={() => setError("")}>
<Icon/> {label}</Link>)}
</nav>
<AccountMenu email={userEmail} onSettings={() => setSettingsOpen(true)} onError={setError}/>
</div>
</header>
<main className={tw.main}>
<div className={tw.content}>
<ErrorBanner className="mb-6" message={error} onDismiss={() => setError("")}/>
{children}
</div>
</main>
<SettingsDialog open={settingsOpen} settings={company} onOpenChange={setSettingsOpen} onSaved={setCompany}/>
</div>;
}
