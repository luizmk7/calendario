import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cauan · Calendário de postagens",
  description: "Planeje e acompanhe as postagens de todas as suas empresas.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
