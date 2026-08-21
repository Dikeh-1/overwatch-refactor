import type { Metadata } from "next";
import Image from "next/image";
import {
  CheckCircle2,
  Eye,
  MapPin,
  Network,
  RadioTower,
  ScanSearch,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Button from "@/components/ui/Button";
import CTABanner from "@/components/home/CTABanner";

type Props = { params: Promise<{ locale: string }> };

type StoryPillar = {
  title: string;
  description: string;
};

type OperatingStage = {
  title: string;
  description: string;
};

type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

const operatingIcons = [Eye, UsersRound, RadioTower];
const pillarIcons = [ScanSearch, UsersRound, Network, ShieldCheck];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.about" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/about`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/about`]),
      ),
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tHow = await getTranslations("howItWorks");
  const heroTrust = t.raw("hero.trust") as string[];
  const storyParagraphs = t.raw("story.paragraphs") as string[];
  const operatingStages = t.raw("operatingModel.stages") as OperatingStage[];
  const pillars = t.raw("pillars.items") as StoryPillar[];
  const flow = tHow.raw("flow") as ProcessStep[];

  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-[#0b0f18] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.09),transparent_34%),radial-gradient(circle_at_80%_55%,rgba(59,130,246,0.12),transparent_36%)]" />
        <div className="absolute inset-0 tech-grid opacity-35" />

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-4 pb-14 pt-28 sm:px-6 sm:pb-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-8 lg:pb-20 lg:pt-32">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              <MapPin size={14} className="text-accent" aria-hidden="true" />
              {t("hero.eyebrow")}
            </div>

            <h1 className="max-w-3xl text-balance text-[clamp(2.35rem,9vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.04em] text-white">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base font-medium leading-relaxed text-white/75 sm:text-lg lg:text-xl">
              {t("hero.description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/contact#assessment-form"
                size="lg"
                className="w-full bg-white text-[#0b0f18] hover:bg-white/90 sm:w-auto"
              >
                {t("hero.primaryCta")}
              </Button>
              <Button
                href="#our-approach"
                size="lg"
                variant="secondary"
                className="w-full border-white/35 text-white hover:border-white hover:bg-white/10 sm:w-auto"
              >
                {t("hero.secondaryCta")}
              </Button>
            </div>

            <ul className="mt-8 grid gap-3 text-sm text-white/72 sm:grid-cols-3">
              {heroTrust.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-accent" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] shadow-2xl shadow-black/40">
              <Image
                src="/about-hero.webp"
                alt={t("hero.imageAlt")}
                fill
                preload
                quality={80}
                sizes="(max-width: 1024px) calc(100vw - 2rem), 44vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f18]/90 via-[#0b0f18]/15 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-[#0b0f18]/82 p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[#0b0f18]">
                    <ShieldCheck size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                      {t("hero.cardLabel")}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-white sm:text-base">
                      {t("hero.cardText")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 sm:py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
              {t("story.eyebrow")}
            </p>
            <h2 className="mt-4 max-w-xl text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t("story.title")}
            </h2>
          </div>

          <div className="space-y-5 text-base leading-relaxed text-muted sm:text-lg">
            {storyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <blockquote className="mt-8 rounded-2xl border border-accent/25 bg-accent/[0.06] p-6 text-lg font-semibold leading-relaxed text-foreground sm:p-8 sm:text-xl">
              <span className="mb-4 block h-1 w-12 rounded-full bg-accent" />
              “{t("story.promise")}”
            </blockquote>
          </div>
        </div>
      </section>

      <section id="our-approach" className="scroll-mt-20 border-y border-border bg-primary-darker/45 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
              {t("operatingModel.eyebrow")}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("operatingModel.title")}
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">
              {t("operatingModel.description")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            {operatingStages.map((stage, index) => {
              const Icon = operatingIcons[index] ?? ShieldCheck;
              return (
                <article
                  key={stage.title}
                  className="rounded-2xl border border-border bg-background/70 p-6 shadow-sm sm:p-7"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                    <Icon size={21} aria-hidden="true" />
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-foreground">{stage.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{stage.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
                {t("pillars.eyebrow")}
              </p>
              <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t("pillars.title")}
              </h2>
              <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted sm:text-lg">
                {t("pillars.description")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pillars.map((pillar, index) => {
                const Icon = pillarIcons[index] ?? ShieldCheck;
                return (
                  <article key={pillar.title} className="rounded-2xl border border-border bg-primary-darker/25 p-6">
                    <Icon size={22} className="text-accent" aria-hidden="true" />
                    <h3 className="mt-5 text-lg font-bold text-foreground">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                      {pillar.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-primary-darker/45 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
              {t("process.eyebrow")}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("process.title")}
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted sm:text-lg">
              {t("process.description")}
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {flow.map((item) => (
              <li key={item.step} className="relative rounded-2xl border border-border bg-background/65 p-5 sm:p-6">
                <span className="text-sm font-bold tracking-[0.16em] text-accent">{item.step}</span>
                <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
