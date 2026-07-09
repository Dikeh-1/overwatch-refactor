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

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.home" });

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
        "https://res.cloudinary.com/dxvvzuu3n/image/upload/v1778238103/vrag_ffsyrb.png",
      ],
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
