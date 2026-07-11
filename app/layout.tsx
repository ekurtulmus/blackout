import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLACKOUT — Karanlıkta Kaçış",
  description:
    "Karanlık labirentte el fenerinle yolunu keşfet, zombilerden kaç, gizli çıkışı bul.",
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
