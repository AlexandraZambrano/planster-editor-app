import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/shared/site-footer";
import { FooterGate } from "@/components/shared/footer-gate";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s — Planster",
    default: "Planster — Write your story",
  },
  description: "The most complete writing environment for authors and beta readers.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Planster",
  },
};

export const viewport: Viewport = {
  themeColor: "#6D28D9",
  // Lets env(safe-area-inset-*) work so the mobile tab bar clears the iOS home indicator
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages, t] = await Promise.all([getLocale(), getMessages(), getTranslations("Nav")]);

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans antialiased min-h-dvh flex flex-col`}
      >
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider messages={messages}>
          {/* flex-1 pins the footer to the bottom on short pages instead of floating mid-screen;
              [&>*]:w-full stops "mx-auto max-w-*" page wrappers from shrinking to their content in the flex column */}
          <div id="content" tabIndex={-1} className="flex flex-1 flex-col outline-none [&>*]:w-full">
            {children}
          </div>
          <FooterGate>
            <SiteFooter />
          </FooterGate>
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
