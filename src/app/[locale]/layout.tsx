import { Inter, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Script from "next/script";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add(theme);
                } catch(e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </NextIntlClientProvider>
        </ThemeProvider>

        {/* Zoho SalesIQ Chat Widget */}
        <Script id="zoho-init" strategy="beforeInteractive">
          {`
    window.$zoho = window.$zoho || {};
    $zoho.salesiq = $zoho.salesiq || {
      widgetcode: "siq80b8b734cb6cc4833",   // ← This was missing
      values: {},
      ready: function() {}
    };
  `}
        </Script>

        <Script
          id="zsiqscript"
          src="https://salesiq.zohopublic.com/widget?wc=siq80b8b734cb6cc4833"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
