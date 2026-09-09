import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "FantAsta 2.0",
  description: "Asta, rosa, formazione e analisi per il Fantacalcio",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
