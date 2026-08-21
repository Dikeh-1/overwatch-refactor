import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ContactForm from "@/components/shared/ContactForm";
import FadeIn from "@/components/animations/FadeIn";
import ContactParticles from "@/components/animations/ContactParticles";
import GlowCard from "@/components/ui/GlowCard";
import { getSiteAddress, siteContact } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.contact" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/contact`,
      languages: Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/contact`])),
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const descriptionParts = t("description").split("\n\n");
  const intro = descriptionParts[0];
  const ctaLine = descriptionParts[1] ?? "";

  return (
    <>
      {/* HERO SECTION — permanently dark so transparent navbar remains visible */}
      <section className="relative pt-24 md:pt-32 pb-20 bg-primary-dark overflow-hidden dark">
        {/* Interactive Background */}
        <div className="absolute inset-0 z-0 opacity-40">
          <ContactParticles />
        </div>

        <FadeIn direction="up" delay={0.1} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column: Heading & Intro */}
            <div className="text-left space-y-6">
              <p className="text-accent text-sm font-semibold uppercase tracking-wider">
                {t("label")}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {t("title")}
              </h1>
              <p className="text-lg md:text-xl text-muted leading-relaxed max-w-lg">
                {intro}
              </p>
            </div>

            {/* Right Column: CTA & Contact Info */}
            <div className="text-left w-full max-w-xl mx-auto lg:mx-0">
              <GlowCard techCorners={true} className="w-full p-8 md:p-10 bg-primary-darker/60 backdrop-blur-sm border-border/50">
                {ctaLine && (
                  <p className="font-bold text-foreground mb-6 text-xl md:text-2xl">{ctaLine}</p>
                )}
                <div className="space-y-4 text-sm">
                  <p className="text-muted">
                    <span className="text-foreground font-medium">Email: </span>
                    {siteContact.email}
                  </p>
                  <p className="text-muted">
                    <span className="text-foreground font-medium">Website: </span>
                    {siteContact.website}
                  </p>
                  <p className="text-muted">
                    <span className="text-foreground font-medium">WhatsApp: </span>
                    {siteContact.phone}
                  </p>
                  <p className="text-muted">
                    <span className="text-foreground font-medium">Location: </span>
                    {getSiteAddress(locale)}
                  </p>
                </div>
              </GlowCard>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Form Section — light background for clean legibility */}
      <section id="assessment-form" className="scroll-mt-24 py-20 bg-background overflow-hidden">
        <FadeIn direction="up" delay={0.3} className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10 w-full">
          <ContactForm />
        </FadeIn>
      </section>
    </>
  );
}
