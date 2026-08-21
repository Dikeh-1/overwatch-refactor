"use client";

import { useState } from "react";
import { ArrowRight, Check, Settings2, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ScrollReveal from "@/components/animations/ScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { siteContact } from "@/lib/site-config";

type Plan = {
  name: string;
  audience: string;
  badge?: string;
  price: string;
  currency: string;
  featured?: boolean;
  features: string[];
};

const paymentOptions = [
  { months: 3, discount: 2 },
  { months: 6, discount: 7, recommended: true },
  { months: 12, discount: 12 },
];

export default function Pricing() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const numberLocale = locale === "pt" ? "pt-MZ" : "en-US";
  const [selectedMonths, setSelectedMonths] = useState(6);
  const selectedOption =
    paymentOptions.find((option) => option.months === selectedMonths) ?? paymentOptions[1];
  const plans = [
    t.raw("plans.four") as Plan,
    t.raw("plans.eight") as Plan,
    t.raw("plans.sixteen") as Plan,
  ];

  const getPlanPricing = (plan: Plan) => {
    const originalPrice = Number.parseInt(plan.price.replace(/[^0-9]/g, ""), 10);
    const monthlyPrice = Math.round(originalPrice * (1 - selectedOption.discount / 100));
    const upfrontTotal = monthlyPrice * selectedMonths;
    const annualSavings = (originalPrice - monthlyPrice) * 12;

    return { originalPrice, monthlyPrice, upfrontTotal, annualSavings };
  };

  const getWhatsAppOnboardingUrl = (plan: Plan) => {
    const { monthlyPrice, upfrontTotal, annualSavings } = getPlanPricing(plan);
    const planName = plan.badge ? `${plan.name} (${plan.badge})` : plan.name;
    const upfrontMonths = `${selectedMonths} ${t("monthsWord")}`;
    const monthlyRate = `${monthlyPrice.toLocaleString(numberLocale)} ${plan.currency.trim()}${t("perMonth")}`;
    const totalDue = `${upfrontTotal.toLocaleString(numberLocale)} ${plan.currency.trim()}`;
    const annualSaveText = `${annualSavings.toLocaleString(numberLocale)} ${plan.currency.trim()}${t("whatsapp.perYear")}`;
    const message = t("whatsapp.message", {
      planName,
      upfrontMonths,
      discount: `${selectedOption.discount}%`,
      monthlyRate,
      totalDue,
      annualSavings: annualSaveText,
    });

    return `https://api.whatsapp.com/send/?phone=${siteContact.whatsappNumber}&text=${encodeURIComponent(message)}`;
  };

  return (
    <section id="pricing" className="relative overflow-hidden py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-[0.16]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(59,130,246,0.07),transparent_29%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label={t("label")}
          title={t("title")}
          description={t("description")}
          className="mb-8 md:mb-10"
        />

        <div className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted md:mb-10">
          {(t.raw("highlights") as string[]).map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
              {item}
            </span>
          ))}
        </div>

        <ScrollReveal direction="up" distance={24}>
          <div className="mx-auto mb-8 max-w-4xl rounded-[1.5rem] border border-border bg-card p-3 shadow-[0_16px_45px_rgba(2,6,23,0.07)] sm:p-4 md:mb-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3 px-1 sm:px-2">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                  <Settings2 size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{t("selector.title")}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {t("selector.description")}
                  </p>
                </div>
              </div>

              <fieldset className="shrink-0">
                <legend className="sr-only">{t("upfrontLabel")}</legend>
                <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-background/65 p-1">
                  {paymentOptions.map((option) => {
                    const isSelected = option.months === selectedMonths;
                    return (
                      <button
                        key={option.months}
                        type="button"
                        onClick={() => setSelectedMonths(option.months)}
                        aria-label={t("selector.optionAria", {
                          months: option.months,
                          percent: option.discount,
                        })}
                        aria-pressed={isSelected}
                        className={cn(
                          "min-h-14 min-w-0 touch-manipulation rounded-xl px-3 py-2 text-center transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 sm:min-w-28",
                          isSelected
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted hover:bg-foreground/[0.05] hover:text-foreground",
                        )}
                      >
                        <span className="block text-sm font-bold sm:text-base">
                          {option.months} {t("monthsShort")}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block whitespace-nowrap text-[0.65rem] font-semibold sm:text-xs",
                            isSelected ? "text-background/70" : "text-muted/75",
                          )}
                        >
                          {option.recommended
                            ? `${t("selector.recommended")} · ${t("selector.discountShort", { percent: option.discount })}`
                            : t("selector.save", { percent: option.discount })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan, index) => {
            const { originalPrice, monthlyPrice, upfrontTotal } = getPlanPricing(plan);
            const currency = plan.currency.trim();

            return (
              <ScrollReveal
                key={plan.name}
                direction="up"
                distance={28}
                delay={index * 0.06}
                className={cn(
                  "flex min-w-0",
                  index === 2 &&
                    "md:col-span-2 md:w-full md:max-w-xl md:justify-self-center lg:col-span-1 lg:max-w-none",
                )}
              >
                <article
                  className={cn(
                    "relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[1.75rem] border bg-card p-5 shadow-[0_18px_48px_rgba(2,6,23,0.07)] transition-[transform,border-color,box-shadow] duration-300 sm:p-7",
                    plan.featured
                      ? "border-foreground/30 shadow-[0_24px_65px_rgba(2,6,23,0.13)] lg:-translate-y-2"
                      : "border-border hover:-translate-y-1 hover:border-foreground/20",
                  )}
                >
                  {plan.featured ? (
                    <div className="absolute inset-x-0 top-0 h-1 bg-foreground" aria-hidden="true" />
                  ) : null}

                  <div className="flex min-h-20 items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
                        {plan.name}
                      </h3>
                      <p className="mt-2 max-w-64 text-sm leading-relaxed text-muted">
                        {plan.audience}
                      </p>
                    </div>
                    {plan.badge ? (
                      <span className="shrink-0 rounded-full border border-foreground/15 bg-foreground/[0.07] px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-foreground">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-7 border-b border-border/75 pb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("monthlyEquivalent")}
                    </p>
                    <div className="mt-3 flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
                      <span className="min-w-0 text-[clamp(2.6rem,5vw,3.6rem)] font-bold leading-none tracking-[-0.05em] text-foreground">
                        {monthlyPrice.toLocaleString(numberLocale)}
                      </span>
                      <span className="pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        {currency} {t("perMonth")}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-foreground/[0.07] px-2.5 py-1 text-xs font-semibold text-foreground">
                        {t("discountApplied", { percent: selectedOption.discount })}
                      </span>
                      <span className="text-xs text-muted">
                        {t("standardRate", {
                          price: originalPrice.toLocaleString(numberLocale),
                          currency,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-background/55 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      {t("billingSummary.label")}
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
                      {upfrontTotal.toLocaleString(numberLocale)} {currency}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {t("billingSummary.description", { months: selectedMonths })}
                    </p>
                  </div>

                  <div className="mt-6 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("includedLabel")}
                    </p>
                    <ul className="mt-4 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                            <Check size={12} strokeWidth={3} aria-hidden="true" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    href={getWhatsAppOnboardingUrl(plan)}
                    variant={plan.featured ? "primary" : "secondary"}
                    className="mt-7 w-full gap-2"
                    external
                  >
                    {t("planCta", { plan: plan.name })}
                    <ArrowRight size={17} aria-hidden="true" />
                  </Button>
                </article>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal direction="up" distance={24}>
          <div className="mt-8 grid gap-4 rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_16px_45px_rgba(2,6,23,0.06)] sm:p-6 lg:grid-cols-[1.15fr_1fr_1fr] lg:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                <Settings2 size={18} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{t("setup.label")}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t("setup.value")}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/55 p-4">
              <p className="text-sm font-medium text-muted">{t("installation.title")}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {t("installation.price")}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted">{t("cloudBridge.title")}</p>
                <span className="rounded-full bg-foreground/[0.07] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-foreground">
                  {t("cloudBridge.depositLabel")}
                </span>
              </div>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {t("cloudBridge.deposit")}
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" distance={24}>
          <div className="mt-6 flex flex-col gap-6 rounded-[1.75rem] border border-border bg-foreground/[0.045] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                <ShieldCheck size={21} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {t("decisionHelp.title")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                  {t("decisionHelp.description")}
                </p>
                <p className="mt-2 text-xs font-medium text-foreground/70">
                  {t("termsNote")}
                </p>
              </div>
            </div>
            <Button href="/contact#assessment-form" size="lg" className="shrink-0 gap-2">
              {t("decisionHelp.cta")}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
