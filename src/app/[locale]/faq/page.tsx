import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  ClipboardCheck,
  MonitorCheck,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import FAQAccordion from "@/components/shared/FAQAccordion";
import CTABanner from "@/components/home/CTABanner";
import TechGrid from "@/components/ui/TechGrid";

type Props = { params: Promise<{ locale: string }> };

type Highlight = {
  title: string;
  description: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.faq" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/faq`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/faq`]),
      ),
    },
  };
}

const highlightIcons = [MonitorCheck, ShieldCheck, ClipboardCheck];

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const highlights = t.raw("highlights") as Highlight[];
  const processSteps = t.raw("processSteps") as string[];

  return (
    <>
      <section className="dark relative overflow-hidden bg-[#090d16] pb-16 pt-28 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <TechGrid className="absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(255,255,255,0.09),transparent_28%),radial-gradient(circle_at_88%_20%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(to_bottom,transparent_65%,rgba(15,17,23,0.55))]" />
        <div className="absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full border border-white/[0.035] sm:h-[30rem] sm:w-[30rem] lg:left-[78%] lg:top-14" />
        <div className="absolute left-1/2 top-32 h-64 w-64 -translate-x-1/2 rounded-full border border-white/[0.04] sm:h-96 sm:w-96 lg:left-[78%] lg:top-24" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.055] px-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
              <ShieldCheck size={15} aria-hidden="true" />
              {t("label")}
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg lg:text-xl">
              {t("description")}
            </p>
            <a
              href="#questions"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#090d16] shadow-lg shadow-black/20 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#090d16] sm:w-auto sm:text-base"
            >
              {t("browseQuestions")}
              <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-xl pb-6 [perspective:1200px]">
            <div className="absolute inset-x-7 bottom-0 top-8 rounded-[1.75rem] border border-white/[0.07] bg-white/[0.025] [transform:translate3d(0,22px,-80px)]" />
            <div className="absolute inset-x-4 bottom-3 top-4 rounded-[1.75rem] border border-white/[0.09] bg-white/[0.035] [transform:translate3d(0,10px,-35px)]" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#121827]/95 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-transform duration-500 sm:p-6 lg:[transform:rotateY(-5deg)_rotateX(2deg)] lg:hover:[transform:rotateY(-1deg)_rotateX(0deg)_translateY(-4px)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(96,165,250,0.13),transparent_34%)]" />
              <div className="relative flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    {t("heroCardLabel")}
                  </p>
                  <p className="mt-1 text-base font-semibold text-white sm:text-lg">
                    {t("heroCardTitle")}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-white">
                  <ShieldCheck size={21} aria-hidden="true" />
                </div>
              </div>

              <div className="relative mt-4 space-y-3">
                {highlights.map((item, index) => {
                  const Icon = highlightIcons[index] ?? ShieldCheck;
                  return (
                    <div
                      key={item.title}
                      className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3.5 sm:p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#101624] shadow-sm">
                        <Icon size={19} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white sm:text-base">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/58 sm:text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/15 px-3 py-3 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/55 sm:px-4 sm:text-xs">
                {processSteps.map((step, index) => (
                  <div className="contents" key={step}>
                    <span>{step}</span>
                    {index < processSteps.length - 1 && (
                      <ArrowRight size={13} className="text-white/25" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="questions" className="relative scroll-mt-20 overflow-clip bg-background py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 tech-grid opacity-35" />
        <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-foreground/[0.025] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14 lg:px-8">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {t("questionsLabel")}
            </p>
            <h2 className="mt-3 max-w-md text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              {t("questionsTitle")}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
              {t("questionsDescription")}
            </p>

            <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_14px_38px_rgba(2,6,23,0.08)] sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
                <ClipboardCheck size={21} aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("supportLabel")}
              </p>
              <h3 className="mt-2 text-xl font-bold leading-snug text-foreground">
                {t("supportTitle")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {t("supportDescription")}
              </p>
              <Link
                href="/contact#assessment-form"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl font-semibold text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                {t("supportButton")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </aside>

          <div className="min-w-0">
            <FAQAccordion searchable />
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
