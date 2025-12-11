import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TCG Deal Finder",
  description: "Find undervalued Pokémon cards from trusted sellers on eBay.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
