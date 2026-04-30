import type { Metadata } from "next";
import "./globals.css";
import { SupabaseSessionBridge } from "./components/supabase-session-bridge";

const siteTitle = "Agrarius Gestão";
const siteDescription =
  "Plataforma interna da Agrarius para gestão de clientes, serviços, tarefas, prazos e financeiro em um único ambiente organizado.";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteTitle,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Agrarius Gestão - Sistema interno de gestão operacional e financeira",
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
    title: "Agrarius Gestão - Sistema interno de gestão operacional e financeira",
    description: siteDescription,
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col text-[15px] leading-relaxed">
        <SupabaseSessionBridge />
        {children}
      </body>
    </html>
  );
}
