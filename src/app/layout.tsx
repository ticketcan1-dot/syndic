import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SyndiConnect — Votre copropriété, en toute transparence",
    template: "%s · SyndiConnect",
  },
  description:
    "Gestion des copropriétés au Maroc. Organisez vos résidences et vos lots dans un espace sécurisé.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
