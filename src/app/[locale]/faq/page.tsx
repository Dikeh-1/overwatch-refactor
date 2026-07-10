import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import SectionHeader from "@/components/ui/SectionHeader";
import FAQAccordion from "@/components/shared/FAQAccordion";
import CTABanner from "@/components/home/CTABanner";
import ScrollReveal from "@/components/animations/ScrollReveal";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.faq" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/faq`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/faq`]),
      ),
    },
  };
}

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");

  return (
    <>
      <section className="relative pt-24 md:pt-32 pb-20 bg-primary-dark overflow-hidden dark">
        <Image
          src="/faq-hero.webp"
          alt=""
          fill
          className="object-cover"
          preload
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary-dark/85 to-primary-dark/55" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/80 via-primary-darker/70 to-primary-dark/40" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-3xl">
            <SectionHeader
              title={t("title")}
              description={t("description")}
              align="left"
              as="h1"
            />
          </div>
        </div>
      </section>

      {/* Accordion Section — light background for clean legibility */}
      <section className="py-20 bg-background overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" delay={0.1}>
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <FAQAccordion />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
