import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Script from "next/script";
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
      lang={locale}
      className="h-full"
      suppressHydrationWarning
    >
      <head>
        <link rel="preload" href="/hero_dark.webp" as="image" type="image/webp" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://salesiq.zohopublic.com" />
        <link rel="dns-prefetch" href="https://salesiq.zohopublic.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <Script
          id="zoho-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.$zoho=window.$zoho || {};$zoho.salesiq=$zoho.salesiq||{ready:function(){}}`
          }}
        />
        <Script
          id="zoho-script"
          src="https://salesiq.zohopublic.com/widget?wc=siq80b8b734cb6cc48334e01ab8c29da76f4ecfcbad2ed2ade5b18c142f9ec357da"
          strategy="afterInteractive"
        />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var savedTheme=localStorage.getItem('theme');var themeVersion=localStorage.getItem('theme_version');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=themeVersion==='2'&&savedTheme?savedTheme:(prefersDark?'dark':'light');document.documentElement.classList.remove('dark','light');if(theme==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <ScrollToTop />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
