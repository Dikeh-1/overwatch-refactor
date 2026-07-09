import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import SectionHeader from "@/components/ui/SectionHeader";
import CTABanner from "@/components/home/CTABanner";
import FadeIn from "@/components/animations/FadeIn";
import StaggeredList from "@/components/animations/StaggeredList";
import InteractiveCard from "@/components/animations/InteractiveCard";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ParallaxImage from "@/components/animations/ParallaxImage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.about" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/about`,
      languages: Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/about`])),
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("howItWorks");
  const flow = t.raw("flow") as { step: string; title: string; description: string }[];
  const capabilities = t.raw("capabilities.items") as string[];

  return (
    <>
      {/* HERO SECTION */}
      <section className="relative min-h-[50vh] md:min-h-[400px] flex items-center overflow-hidden dark">
        {/* Parallax Background Image */}
        <ParallaxImage className="absolute inset-0" speed={0.15}>
          <Image
            src="/surveillance-control-room.webp"
            alt="Overwatch Control Center"
            fill
            className="object-cover"
            preload
            sizes="100vw"
            quality={80}
          />
        </ParallaxImage>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/70 to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/80 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(at_center,#4f46e520_0%,transparent_70%)] z-10" />

        {/* Content */}
        <FadeIn direction="up" delay={0.1} className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10 w-full">
          <div className="max-w-4xl">
            <SectionHeader
              title={t("title")}
              description={t("description")}
              align="left"
              variant="white"
            />
          </div>
        </FadeIn>
      </section>

      {/* Flow / Timeline Section */}
      <section className="py-8 md:py-8 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="hidden lg:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent/60 via-accent/20 to-transparent" />
            <StaggeredList staggerDuration={0.15} className="space-y-6">
              {flow.map((item, i) => (
                <div key={item.step} className="relative lg:pl-20">
                  <div className="hidden lg:flex absolute left-0 w-16 h-16 rounded-full bg-accent/10 border border-accent/30 items-center justify-center backdrop-blur-sm">
                    <span className="text-accent font-bold text-lg">
                      {item.step}
                    </span>
                  </div>
                  <InteractiveCard>
                    <div className="bg-primary-darker/20 rounded-2xl p-6 md:p-8 border border-border transition-colors hover:border-accent/40 h-full">
                      <div className="lg:hidden text-accent font-bold text-sm mb-2">
                        {item.step}
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {item.title}
                      </h3>
                      <p className="text-muted leading-relaxed whitespace-pre-line">
                        {item.description}
                      </p>
                    </div>
                  </InteractiveCard>
                  {i < flow.length - 1 && (
                    <div className="lg:hidden flex justify-center my-4">
                      <div className="w-px h-8 bg-accent/30" />
                    </div>
                  )}
                </div>
              ))}
            </StaggeredList>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-20 md:py-28 bg-primary-darker/50 border-t border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-12 text-center">
              {t("capabilities.title")}
            </h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilities.map((cap, i) => (
              <ScrollReveal key={cap} direction="up" delay={i * 0.05}>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-primary-darker/20 hover:border-accent/30 transition-colors h-full">
                  <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                  <span className="text-foreground text-sm font-medium">{cap}</span>
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
