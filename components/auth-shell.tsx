import Image from "next/image";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 lg:p-6">
      <section className="grid min-h-[calc(100vh-2rem)] w-full max-w-[1380px] overflow-hidden rounded-[28px] border bg-card shadow-[0_24px_70px_rgba(0,27,72,0.10)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(380px,0.85fr)_minmax(520px,1.15fr)]" aria-label="Accès à RD Gestion & Services">
        <div className="relative hidden overflow-hidden bg-foreground p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <Image className="h-auto w-[240px]" src="/logo-web-white.svg" alt="RD Gestion & Services" width={240} height={47} preload />
          <div className="relative max-w-[480px]">
            <span className="mb-7 block h-1 w-14 rounded-full bg-primary" aria-hidden="true" />
            <p className="text-4xl leading-[1.12] font-semibold tracking-[-0.03em] xl:text-5xl">Votre gestion, simplement.</p>
            <p className="mt-6 max-w-[410px] text-lg leading-8 text-white/70">Clients, factures et courriers réunis dans un espace clair et sécurisé.</p>
          </div>
          <p className="text-sm text-white/50">RD Gestion &amp; Services</p>
          <div className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full border border-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-8 -bottom-8 size-44 rounded-full border border-primary/40" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-16 xl:px-24">
          <Card className="w-full max-w-[480px] gap-0 border-0 bg-transparent p-0 shadow-none">
            <CardHeader className="gap-3 px-0 pb-0">
              <Image className="mb-8 h-auto w-[210px] lg:hidden" src="/logo-web.svg" alt="RD Gestion & Services" width={210} height={41} preload />
              <span className="block h-1 w-12 rounded-full bg-primary" aria-hidden="true" />
              <CardTitle className="pt-3"><h1 className="text-3xl leading-tight font-semibold tracking-[-0.025em] sm:text-4xl">{title}</h1></CardTitle>
              <CardDescription className="max-w-[420px] text-base leading-7">{description}</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-8">{children}</CardContent>
            {footer ? <CardFooter className="px-0 pt-6">{footer}</CardFooter> : null}
          </Card>
        </div>
      </section>
    </main>
  );
}
