import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Eye,
  Fence,
  HeartHandshake,
  Home,
  Moon,
  PhoneCall,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Button from "@/components/ui/Button";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";
import CTABanner from "@/components/home/CTABanner";

type Props = { params: Promise<{ locale: string }> };

const featureIcons = [Users, Fence, Waves, Moon];
const featureKeys = ["family", "perimeter", "pool", "overnight"] as const;
const reassuranceIcons = [ShieldCheck, BellRing, PhoneCall];

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
  const trust = t.raw("hero.trust") as string[];
  const stages = t.raw("hero.stages") as string[];
  const reassuranceItems = t.raw("reassurance.items") as {
    title: string;
    description: string;
  }[];

  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-[#0c0f15] pb-16 pt-28 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_13%_24%,rgba(255,255,255,0.09),transparent_30%),radial-gradient(circle_at_88%_36%,rgba(59,130,246,0.12),transparent_34%)]" />
        <div className="absolute inset-0 tech-grid opacity-30" />
        <div className="absolute -right-32 top-16 h-[34rem] w-[34rem] rounded-full border border-white/[0.05]" />
        <div className="absolute -right-12 top-36 h-[25rem] w-[25rem] rounded-full border border-white/[0.06]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <span className={darkEyebrowClassName}>
              <Home size={14} className="shrink-0" aria-hidden="true" />
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-6 text-balance text-[clamp(2.4rem,8vw,4.7rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base font-medium leading-relaxed text-white/70 sm:text-lg lg:text-xl">
              {t("description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/contact#assessment-form"
                size="lg"
                className="w-full whitespace-nowrap bg-white px-4 text-[clamp(0.68rem,3.5vw,0.875rem)] text-[#0c0f15] hover:bg-white/90 sm:w-auto sm:px-5 sm:text-sm"
              >
                {t("cta")}
                <ArrowRight size={17} className="ml-2" aria-hidden="true" />
              </Button>
              <Button
                href="#home-protection"
                size="lg"
                variant="secondary"
                className="w-full whitespace-nowrap border-white/25 px-4 text-[clamp(0.68rem,3.5vw,0.875rem)] text-white hover:border-white/55 hover:bg-white/[0.07] sm:w-auto sm:px-5 sm:text-sm"
              >
                {t("hero.secondaryCta")}
                <ArrowDown size={17} className="ml-2" aria-hidden="true" />
              </Button>
            </div>

            <ul className="mt-8 grid gap-3 text-sm text-white/68 sm:grid-cols-3">
              {trust.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-white/80"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl pb-7 [perspective:1300px] lg:max-w-none">
            <div className="absolute inset-x-8 bottom-0 top-14 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] [transform:translate3d(0,24px,-90px)]" />
            <div className="absolute inset-x-4 bottom-3 top-8 rounded-[2rem] border border-white/[0.09] bg-white/[0.035] [transform:translate3d(0,12px,-40px)]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#151a24]/95 p-3 shadow-[0_38px_90px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-4 lg:[transform:rotateY(-3deg)_rotateX(1deg)]">
              <div className="flex items-center justify-between gap-4 px-2 pb-3 pt-1 sm:px-3 sm:pb-4">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.17em] text-white/42">
                    {t("hero.cardLabel")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                    {t("hero.cardTitle")}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-white/82">
                  <HeartHandshake size={20} aria-hidden="true" />
                </span>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden rounded-[1.35rem] border border-white/10 bg-black">
                <Image
                  src="/homes-bg.webp"
                  alt={t("hero.imageAlt")}
                  fill
                  preload
                  quality={80}
                  sizes="(max-width: 1024px) calc(100vw - 2rem), 48vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14]/90 via-transparent to-[#0b0e14]/20" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-[#0b0e14]/82 px-3 py-2.5 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-4 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-55 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="truncate text-xs font-semibold text-white/82 sm:text-sm">
                      {t("hero.liveLabel")}
                    </span>
                  </div>
                  <Eye size={17} className="shrink-0 text-white/55" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 rounded-2xl border border-white/[0.075] bg-black/15 px-2 py-3 text-center text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white/57 sm:gap-2 sm:px-4 sm:text-xs">
                {stages.map((stage, index) => (
                  <div className="contents" key={stage}>
                    <span>{stage}</span>
                    {index < stages.length - 1 ? (
                      <ArrowRight size={13} className="text-white/28" aria-hidden="true" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="home-protection"
        className="relative scroll-mt-20 overflow-hidden bg-background py-16 sm:py-20 lg:py-28"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.05),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/65">
                {t("featuresSection.eyebrow")}
              </p>
              <h2 className="mt-4 max-w-xl text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {t("featuresSection.title")}
              </h2>
            </div>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg lg:justify-self-end">
              {t("featuresSection.description")}
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14">
            {featureKeys.map((key, index) => {
              const Icon = featureIcons[index] ?? ShieldCheck;
              return (
                <article
                  key={key}
                  className="group rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(2,6,23,0.07)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_24px_70px_rgba(2,6,23,0.1)] sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-primary-darker/45 text-foreground">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-bold tracking-[0.18em] text-muted/65">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-foreground sm:text-2xl">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                    {t(`features.${key}.description`)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dark relative overflow-hidden border-y border-white/8 bg-[#11141b] py-16 text-white sm:py-20 lg:py-24">
        <div className="absolute inset-0 tech-grid opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_82%,rgba(59,130,246,0.1),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
              {t("reassurance.eyebrow")}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("reassurance.title")}
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-white/65 sm:text-lg">
              {t("reassurance.description")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {reassuranceItems.map((item, index) => {
              const Icon = reassuranceIcons[index] ?? ShieldCheck;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white/82">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/62">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
