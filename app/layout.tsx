import type { Metadata } from "next";
import "./globals.css";

const siteTitle = "Agrarius Gestão";
const siteDescription =
  "Plataforma interna da Agrarius para gestão de clientes, serviços, tarefas, prazos e financeiro em um único ambiente organizado.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  openGraph: {
    title: "Agrarius Gestão — Sistema interno de gestão operacional e financeira",
    description: siteDescription,
    url: "/",
    siteName: siteTitle,
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Agrarius Gestão",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agrarius Gestão — Sistema interno de gestão operacional e financeira",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
