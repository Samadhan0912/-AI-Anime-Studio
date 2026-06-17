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
  title: "AI Anime Studio",
  description: "Advanced Local-First AI Anime Production Suite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning // FIXED: Suppresses hydration crashes caused by third-party browser extensions [1]
    >
      <body className="h-full bg-[#050505] text-[#f5f5f7] selection:bg-white/15 selection:text-white">
        {children}
      </body>
    </html>
  );
}