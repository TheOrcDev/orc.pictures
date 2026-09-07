import type { Metadata, Viewport } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { GifCommandMenu } from "@/components/gif-command-menu";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  ORCDEV_NAME,
  ORCDEV_URL,
  ORCDEV_X,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#1c1c16", media: "(prefers-color-scheme: dark)" },
  ],
};

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  applicationName: SITE_NAME,
  authors: [{ name: ORCDEV_NAME, url: ORCDEV_URL }],
  category: "entertainment",
  creator: ORCDEV_NAME,
  description: SITE_DESCRIPTION,
  icons: {
    apple: "/apple-icon.png",
    icon: [
      { type: "image/x-icon", url: "/favicon.ico" },
      { sizes: "512x512", type: "image/png", url: "/icon.png" },
    ],
  },
  keywords: [...SITE_KEYWORDS],
  metadataBase: SITE_URL,
  openGraph: {
    description: SITE_DESCRIPTION,
    images: [
      {
        alt: SITE_TITLE,
        height: 630,
        type: "image/png",
        url: "/og.png",
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    type: "website",
    url: "/",
  },
  publisher: ORCDEV_NAME,
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
    },
    index: true,
  },
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  twitter: {
    card: "summary_large_image",
    creator: ORCDEV_X,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
    site: ORCDEV_X,
    title: SITE_TITLE,
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={cn(
      "antialiased",
      fontMono.variable,
      "font-sans",
      outfit.variable
    )}
  >
    <body>
      <ThemeProvider>
        <div className="flex min-h-svh flex-col">
          {children}
          <SiteFooter />
        </div>
        <GifCommandMenu />
        <Toaster />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
