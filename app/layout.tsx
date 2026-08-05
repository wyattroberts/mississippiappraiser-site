import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  metadataBase: new URL("https://mississippiappraiser.com"),
  title: {
    default: "Commercial Property Appraiser in Mississippi — Wyatt Roberts, MAI",
    template: "%s — Mississippi Appraiser",
  },
  description: "Commercial property appraisal, land valuation, and real estate consulting throughout Mississippi.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/wp-content/uploads/2019/12/mississippi_appraiser_logo_only_40x40.ico",
    shortcut: "/wp-content/uploads/2019/12/mississippi_appraiser_logo_only_40x40.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
