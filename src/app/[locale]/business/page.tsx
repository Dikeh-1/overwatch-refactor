import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Warehouse,
  ShoppingBag,
  Factory,
  Building2,
  Clock,
} from "lucide-react";
import { routing } from "@/i18n/routing";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import CTABanner from "@/components/home/CTABanner";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ParallaxImage from "@/components/animations/ParallaxImage";
import ScrollFadeHero from "@/components/animations/ScrollFadeHero";

type Props = { params: Promise<{ locale: string }> };

const sectorIcons = [Factory, Warehouse, ShoppingBag, Building2];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.business" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/business`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/business`]),
      ),
    },
  };
}

export default async function BusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("business");

  const sectors = t.raw("sectors.items") as {
    title: string;
    description: string;
    helpsMonitor: string;
    bullets: string[];
    outro: string;
  }[];

  const steps = t.raw("implementation.steps") as {
    title: string;
    description: string;
  }[];

  return (
    <>
      <section className="relative min-h-[65vh] md:min-h-[550px] flex items-center overflow-hidden dark">
        <ParallaxImage className="absolute inset-0" speed={0.2}>
          <Image
            src="/business-bg.webp"
            alt="Warehouse AI surveillance background"
            fill
            className="object-cover"
            preload
            sizes="100vw"
            quality={80}
          />
        </ParallaxImage>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/70 to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/80 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(at_center,#4f46e520_0%,transparent_70%)] z-10" />

        <ScrollFadeHero className="relative z-20 w-full translate-y-8 sm:translate-y-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-white">
            <div className="max-w-4xl">
              <SectionHeader
                title={t("title")}
                description={t("description")}
                align="left"
                variant="white"
              />
              <Button href="/contact" size="lg" className="mt-8">
                {t("cta")}
              </Button>
            </div>
          </div>
        </ScrollFadeHero>
      </section>

      {/* Sectors */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
              {t("sectors.title")}
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {sectors.map((sector, i) => {
              const Icon = sectorIcons[i % sectorIcons.length];
              return (
                <ScrollReveal key={sector.title} direction="up" delay={i * 0.1}>
                  <div className="flex flex-col h-full justify-between bg-primary-darker/20 rounded-2xl p-6 md:p-8 border border-border transition-colors hover:border-accent/40">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                          <Icon size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{sector.title}</h3>
                      </div>
                      <p className="text-muted text-sm leading-relaxed mb-3">{sector.description}</p>
                      <p className="text-accent font-semibold text-xs uppercase tracking-wider mb-2">{sector.helpsMonitor}</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        {sector.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="text-accent mt-1 shrink-0">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-4 border-t border-border/40 text-xs text-muted leading-relaxed">{sector.outro}</div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Now */}
      <section className="py-12 md:py-16 border-t border-border bg-primary-darker/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="scale">
            <div className="bg-primary-darker/20 rounded-2xl p-6 md:p-8 border border-border hover:border-accent/40 transition-colors flex flex-col md:flex-row gap-6 items-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Clock size={32} />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("whyNow.title")}</h2>
                <p className="text-muted leading-relaxed whitespace-pre-line">{t("whyNow.description")}</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Implementation Steps */}
      <section className="py-12 md:py-16 bg-primary-darker/50 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">{t("implementation.title")}</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <ScrollReveal key={step.title} direction="up" delay={i * 0.1}>
                <div className="bg-primary-darker/20 rounded-2xl p-6 border border-border hover:border-accent/40 transition-colors h-full">
                  <div className="text-accent text-3xl font-bold mb-3">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
