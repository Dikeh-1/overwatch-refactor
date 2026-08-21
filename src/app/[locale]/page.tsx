import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Hero from "@/components/home/Hero";
import Problem from "@/components/home/Problem";
import WhyChoose from "@/components/home/WhyChoose";
import Solution from "@/components/home/Solution";
import Comparison from "@/components/home/Comparison";
import GuardingAngle from "@/components/home/GuardingAngle";
import Pricing from "@/components/home/Pricing";
import CTABanner from "@/components/home/CTABanner";
import CertificationBar from "@/components/home/CertificationBar";
import PreloadHomeHero from "@/components/home/PreloadHomeHero";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.home" });
  const tMetadata = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "pt" ? "pt_MZ" : "en_US",
      type: "website",
      siteName: "Overwatch",
      images: [
        {
          url: "/overwatch-social-preview.png",
          width: 1200,
          height: 630,
          alt: tMetadata("socialImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/overwatch-social-preview.png"],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}`])
      ),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PreloadHomeHero />
      <Hero />
      <Problem />
      <WhyChoose />
      <Solution />
      <Comparison />
      <GuardingAngle />
      <Pricing />
      <CTABanner />
      <CertificationBar />
    </>
  );
}
