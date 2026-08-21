import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import CTABanner from "@/components/home/CTABanner";
import CareersForm from "@/components/shared/CareersForm";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ScrollFadeHero from "@/components/animations/ScrollFadeHero";
import { siteContact } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.careers" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/careers`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/careers`]),
      ),
    },
  };
}

export default async function CareersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("careers");
  const tWhy = await getTranslations("careers.whyJoin");
  const tOpenings = await getTranslations("careers.openings");

  const benefits = tWhy.raw("items") as {
    title: string;
    description: string;
  }[];

  return (
    <>
      <section className="relative min-h-[60vh] flex items-center overflow-hidden dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary-darker to-primary-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(at_30%_50%,#4f46e520_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_70%_80%,#ffffff08_0%,transparent_50%)]" />

        <ScrollFadeHero className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10 py-20 w-full">
          <div className="max-w-4xl">
            <SectionHeader
              label={t("label")}
              title={t("title")}
              description={t("description")}
              align="left"
            />
          </div>
        </ScrollFadeHero>
      </section>

      {/* Why Join Section */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <SectionHeader
              title={tWhy("title")}
              description={tWhy("description")}
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                <GlowCard techCorners={true} className="h-full">
                  <h3 className="text-xl font-bold text-foreground mb-3 glow-text">
                    {benefit.title}
                  </h3>
                  <p className="text-muted leading-relaxed">
                    {benefit.description}
                  </p>
                </GlowCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Spontaneous Applications Section */}
      <section className="py-20 md:py-28 bg-primary-darker/50 border-t border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <SectionHeader
              title={tOpenings("title")}
              description={tOpenings("description")}
            />
          </ScrollReveal>

          <div className="max-w-3xl mx-auto">
            <ScrollReveal direction="scale" delay={0.2}>
              <GlowCard techCorners={true} className="p-8 md:p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M12 18h.01M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  {t("openings.spontaneous")}
                </h3>
                <p className="text-muted leading-relaxed mb-6">
                  {t("openings.spontaneousDescription")}
                </p>
                <a
                  href={`mailto:${siteContact.email}?subject=Spontaneous Application`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-primary-dark transition-all duration-300 hover:bg-accent/90"
                >
                  Send Your CV
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </GlowCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section className="py-20 md:py-28 border-t border-border overflow-hidden">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <SectionHeader
              title={t("form.title")}
              description={t("form.description")}
            />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <CareersForm />
          </ScrollReveal>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
