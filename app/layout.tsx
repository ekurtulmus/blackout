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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Tasarım: Cinzel YALNIZ büyük başlıklarda; diğer her şey Archivo.
            (EB Garamond yalnız italik lore/atmosfer metinleri için korunur.) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Cinzel:wght@600;700;800&family=EB+Garamond:ital@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
