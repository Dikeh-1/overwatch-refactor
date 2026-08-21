import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/Button";
import CTABanner from "@/components/home/CTABanner";
import SolutionsExplorer, {
  type SolutionService,
} from "@/components/solutions/SolutionsExplorer";

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
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/solutions`]),
      ),
    },
  };
}

export default async function SolutionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("solutions");
  const services = t.raw("services") as SolutionService[];
  const trust = t.raw("hero.trust") as string[];
  const stages = t.raw("hero.stages") as string[];
  const industries = t.raw("whoWeWorkWith.items") as string[];

  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-[#0c0e12] pb-16 pt-28 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,rgba(255,255,255,0.09),transparent_30%),radial-gradient(circle_at_88%_35%,rgba(59,130,246,0.12),transparent_34%)]" />
        <div className="absolute inset-0 tech-grid opacity-30" />
        <div className="absolute -right-28 top-20 h-[32rem] w-[32rem] rounded-full border border-white/[0.05]" />
        <div className="absolute -right-10 top-40 h-[24rem] w-[24rem] rounded-full border border-white/[0.06]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/18 bg-white/[0.065] px-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white/78">
              <Sparkles size={14} aria-hidden="true" />
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-6 text-balance text-[clamp(2.4rem,8vw,4.75rem)] font-bold leading-[1.01] tracking-[-0.045em] text-white">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base font-medium leading-relaxed text-white/70 sm:text-lg lg:text-xl">
              {t("hero.description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href="#capabilities"
                size="lg"
                className="w-full bg-white text-[#0c0e12] hover:bg-white/90 sm:w-auto"
              >
                {t("hero.primaryCta")}
                <ArrowDown size={17} className="ml-2" aria-hidden="true" />
              </Button>
              <Button
                href="/contact#assessment-form"
                size="lg"
                variant="secondary"
                className="w-full border-white/25 text-white hover:border-white/55 hover:bg-white/[0.07] sm:w-auto"
              >
                {t("hero.secondaryCta")}
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
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#151821]/95 p-3 shadow-[0_38px_90px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-4 lg:[transform:rotateY(-3deg)_rotateX(1deg)]">
              <div className="flex items-center justify-between gap-4 px-2 pb-3 pt-1 sm:px-3 sm:pb-4">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.17em] text-white/42">
                    {t("hero.cardLabel")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                    {t("hero.cardTitle")}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-white/82">
                  <ShieldCheck size={20} aria-hidden="true" />
                </span>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden rounded-[1.35rem] border border-white/10 bg-black">
                <Image
                  src="/surveillance-control-room.webp"
                  alt={t("hero.imageAlt")}
                  fill
                  preload
                  quality={80}
                  sizes="(max-width: 1024px) calc(100vw - 2rem), 48vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14]/90 via-transparent to-[#0b0e14]/15" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-[#0b0e14]/80 px-3 py-2.5 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-4 sm:px-4">
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

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 rounded-2xl border border-white/[0.075] bg-black/15 px-2 py-3 text-center text-[0.62rem] font-bold uppercase tracking-[0.11em] text-white/57 sm:gap-2 sm:px-4 sm:text-xs">
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
        id="capabilities"
        className="relative scroll-mt-20 overflow-hidden bg-background py-16 sm:py-20 lg:py-28"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.055),transparent_30%)] dark:bg-[radial-gradient(circle_at_85%_10%,rgba(96,165,250,0.05),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/65">
                {t("explorer.eyebrow")}
              </p>
              <h2 className="mt-4 max-w-xl text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {t("explorer.title")}
              </h2>
            </div>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg lg:justify-self-end">
              {t("explorer.description")}
            </p>
          </div>

          <div className="mt-10 lg:mt-14">
            <SolutionsExplorer
              services={services}
              detailsLabel={t("explorer.detailsLabel")}
              includedLabel={t("explorer.includedLabel")}
            />
          </div>
        </div>
      </section>

      <section className="dark relative overflow-hidden border-y border-white/8 bg-[#111218] py-16 text-white sm:py-20 lg:py-24">
        <div className="absolute inset-0 tech-grid opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_80%,rgba(59,130,246,0.10),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
              {t("whoWeWorkWith.eyebrow")}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("whoWeWorkWith.title")}
            </h2>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-white/65 sm:text-lg">
              {t("whoWeWorkWith.description")}
            </p>
            <Link
              href="/business"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-4 focus-visible:ring-offset-[#111218]"
            >
              {t("whoWeWorkWith.button")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {industries.map((industry) => (
              <div
                key={industry}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.045] px-4 py-3 shadow-sm transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.065] text-white/75">
                  <Building2 size={17} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold leading-snug text-white/82">
                  {industry}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
