import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  description: "orc.pictures",
  title: "orc.pictures",
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
      <ThemeProvider>{children}</ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
