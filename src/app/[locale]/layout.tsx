import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AutoAcceptWidgetCookies from "@/components/layout/AutoAcceptWidgetCookies";
import LaunchExperience from "@/components/layout/LaunchExperience";
import ZohoChatbot from "@/components/layout/ZohoChatbot";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "../globals.css";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale === "pt" ? "pt-MZ" : "en"}
      className="h-full dark"
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <LaunchExperience />
            <AutoAcceptWidgetCookies />
            <ZohoChatbot />
            <ScrollToTop />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
