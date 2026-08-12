import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import ParallaxImage from "@/components/animations/ParallaxImage";
import ScrollFadeHero from "@/components/animations/ScrollFadeHero";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "solutions.metadata" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/solutions`,
      languages: Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/solutions`]))
    },
  };
}

export default async function SolutionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("solutions");
  const items = t.raw("items") as Array<{ title: string; description: string; icon?: string }>;

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[65vh] md:min-h-[550px] flex items-center overflow-hidden dark">
        <ParallaxImage className="absolute inset-0" speed={0.2}>
          <Image
            src="/surveillance-control-room.webp"
            alt="Overwatch monitoring control room"
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
                title={t("hero.title")}
                description={t("hero.description")}
                align="left"
                variant="white"
              />
            </div>
          </div>
        </ScrollFadeHero>
      </section>

      {/* Solutions Grid */}
      <section className="py-12 bg-primary-darker/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <GlowCard key={i} className="h-full" hover={true} techCorners={false} accentColor="gold">
                <div className="p-4">
                  {item.icon && (
                    <div className="mb-4 flex justify-center">
                      {/* Placeholder for icon – replace with actual component or img if needed */}
                      <span className={cn("text-4xl", "text-accent")}>{item.icon}</span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted leading-relaxed">{item.description}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
