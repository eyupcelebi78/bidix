import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bidix - Tek Tıkla 3 Farklı Teklif Oluştur",
    template: "%s | Bidix",
  },
  description: "Ücretsiz deneyin! Aynı ürünlerden otomatik olarak 3 farklı şablonda ve fiyatta profesyonel PDF teklifler üretin. Kayıt gerektirmez.",
  keywords: ["teklif", "fiyat teklifi", "pdf", "fatura", "bidix", "teklif hazırlama", "online teklif"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
