import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ブランド品入札管理",
  description: "中古ブランド品の入札管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* DNS 解決・TCP/TLS 接続を事前確立して外部リンクの体感速度を向上 */}
        <link rel="preconnect" href="https://www.ecoauc.com" />
        <link rel="dns-prefetch" href="https://www.ecoauc.com" />
        <link rel="preconnect" href="https://jp.mercari.com" />
        <link rel="dns-prefetch" href="https://jp.mercari.com" />
        <link rel="preconnect" href="https://www.mercari.com" />
        <link rel="dns-prefetch" href="https://www.mercari.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
