import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agrarius Gestão",
  description: "Sistema interno de gestão operacional e financeira da Agrarius.",
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
