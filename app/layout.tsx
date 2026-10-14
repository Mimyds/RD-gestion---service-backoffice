import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s · RD Gestion & Services", default: "RD Gestion & Services" },
  description: "Clients, factures et courriers de RD Gestion & Services.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The per-request CSP nonce added by proxy.ts requires dynamic rendering.
  await connection();
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
