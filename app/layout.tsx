import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FantAsta",
  description: "Il tuo assistente per asta e stagione Fantacalcio",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
