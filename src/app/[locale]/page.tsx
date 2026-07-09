import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

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

  const Hero = (await import("@/components/home/Hero")).default;
  const Problem = (await import("@/components/home/Problem")).default;
  const WhyChoose = (await import("@/components/home/WhyChoose")).default;
  const Solution = (await import("@/components/home/Solution")).default;
  const Comparison = (await import("@/components/home/Comparison")).default;
  const GuardingAngle = (await import("@/components/home/GuardingAngle")).default;
  const Pricing = (await import("@/components/home/Pricing")).default;
  const CTABanner = (await import("@/components/home/CTABanner")).default;
  const CertificationBar = (await import("@/components/home/CertificationBar")).default;

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
