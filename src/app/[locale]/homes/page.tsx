import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users, Fence, Waves, Moon } from "lucide-react";
import { routing } from "@/i18n/routing";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import Button from "@/components/ui/Button";
import CTABanner from "@/components/home/CTABanner";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ParallaxImage from "@/components/animations/ParallaxImage";
import ScrollFadeHero from "@/components/animations/ScrollFadeHero";

type Props = { params: Promise<{ locale: string }> };

const featureIcons = [Users, Fence, Waves, Moon];
const featureKeys = ["family", "perimeter", "pool", "overnight"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.homes" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/homes`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/homes`]),
      ),
    },
  };
}

export default async function HomesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("homes");

  return (
    <>
      <section className="relative min-h-[65vh] md:min-h-[550px] flex items-center overflow-hidden dark">
        <ParallaxImage className="absolute inset-0" speed={0.2}>
          <Image
            src="/homes-bg.jpg"
            alt="Residential AI Surveillance"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={90}
          />
        </ParallaxImage>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/70 to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/80 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(at_center,#4f46e520_0%,transparent_70%)] z-10" />

        {/* Content fades on scroll */}
        <ScrollFadeHero className="relative z-20 w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <SectionHeader
                title={t("title")}
                description={t("description")}
                align="left"
                variant="white"
              />
              <Button href="/contact" size="lg" className="mt-6">
                {t("cta")}
              </Button>
            </div>
          </div>
        </ScrollFadeHero>
      </section>

      {/* Features Section — staggered scroll reveal */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {featureKeys.map((key, i) => {
              const Icon = featureIcons[i];
              return (
                <ScrollReveal key={key} direction="up" delay={i * 0.12}>
                  <GlowCard>
                    <Icon className="text-accent mb-3" size={36} />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {t(`features.${key}.title`)}
                    </h3>
                    <p className="text-muted leading-relaxed">
                      {t(`features.${key}.description`)}
                    </p>
                  </GlowCard>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
