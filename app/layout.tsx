import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: {
    apple: "/apple-icon.png",
    icon: [
      { type: "image/x-icon", url: "/favicon.ico" },
      { sizes: "512x512", type: "image/png", url: "/icon.png" },
    ],
  },
  metadataBase: SITE_URL,
  openGraph: {
    description: SITE_DESCRIPTION,
    images: [
      {
        alt: SITE_DESCRIPTION,
        height: 630,
        url: "/og.png",
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_NAME,
    type: "website",
    url: "/",
  },
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  twitter: {
    card: "summary_large_image",
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
    title: SITE_NAME,
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
        <Toaster />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
