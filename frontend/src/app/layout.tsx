import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import "./globals.css";

const vazirmatn = localFont({
  src: "../assets/fonts/Vazirmatn-Variable.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Tahoma", "Arial"],
});

export const metadata: Metadata = {
  title: "قیمت‌یار | مقایسه لیست قیمت",
  description: "مقایسه قابل اعتماد نسخه‌های لیست قیمت تأمین‌کنندگان",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>{children}</body>
    </html>
  );
}
