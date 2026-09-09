import type { Metadata } from "next";
import "./globals.css";
import "./auth-extra.css";
import "./gold-theme.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "FantAsta",
  description: "Calcio, aste e strategia per il tuo Fantacalcio",
  applicationName: "FantAsta",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
