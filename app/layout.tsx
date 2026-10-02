import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hinglish Order Desk — Kirana Order Intake",
  description:
    "Order intake desk for Indian local shopkeepers. Interprets casual Hinglish messages, checks live catalog & stock, asks quick clarification, and creates itemized bills.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Hinglish Order Desk",
    description: "Casual Hinglish grocery order intake for Indian shopkeepers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSans.variable}>
      <head>
        <meta name="theme-color" content="#c2410c" />
      </head>
      <body className="min-h-screen bg-[#faf8f5] text-[#18181b] flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
