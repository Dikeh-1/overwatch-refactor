"use client";

import { useState } from "react";
import ScrollReveal from "@/components/animations/ScrollReveal";
import { useLocale, useTranslations } from "next-intl";
import { Check, Settings2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { siteContact } from "@/lib/site-config";

type Plan = {
  name: string;
  badge?: string;
  price: string;
  currency: string;
  featured?: boolean;
  features: string[];
};

export default function Pricing() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const numberLocale = locale === "pt" ? "pt-MZ" : "en-US";
  const plans = [
    t.raw("plans.four") as Plan,
    t.raw("plans.eight") as Plan,
    t.raw("plans.sixteen") as Plan,
  ];

  // State for each plan's upfront payment option
  const [planOptions, setPlanOptions] = useState([3, 3, 3]); // Default to 3 months upfront

  const updatePlanOption = (planIndex: number, months: number) => {
    setPlanOptions(prev => {
      const newOptions = [...prev];
      newOptions[planIndex] = months;
      return newOptions;
    });
  };

  const calculateDiscount = (planIndex: number) => {
    const months = planOptions[planIndex];

    // Upfront payment discounts from content
    if (months >= 12) return 12;
    if (months >= 6) return 7;
    if (months >= 3) return 2;

    return 0;
  };

  const getWhatsAppOnboardingUrl = (
    plan: Plan,
    months: number,
    discountedPrice: number,
    discount: number,
    annualSavings: number
  ) => {
    const planName = plan.badge ? `${plan.name} (${plan.badge})` : plan.name;
    const upfrontMonths = `${months} ${t("monthsLabel")}`;
    const formattedDiscount = discount > 0 ? `${discount}%` : "0%";
    const monthlyRate = `${discountedPrice.toLocaleString(numberLocale)} ${plan.currency.trim()}${t("perMonth")}`;
    const totalDue = `${(discountedPrice * months).toLocaleString(numberLocale)} ${plan.currency.trim()}`;
    const annualSaveText = discount > 0
      ? `${annualSavings.toLocaleString(numberLocale)} ${plan.currency.trim()}${t("whatsapp.perYear")}`
      : t("whatsapp.zeroSavings");

    const text = t("whatsapp.message", {
      planName,
      upfrontMonths,
      discount: formattedDiscount,
      monthlyRate,
      totalDue,
      annualSavings: annualSaveText,
    });

    return `https://api.whatsapp.com/send/?phone=${siteContact.whatsappNumber}&text=${encodeURIComponent(text)}`;
  };

  return (
    <section id="pricing" className="relative overflow-hidden py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-25" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(59,130,246,0.055),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <SectionHeader title={t("title")} description={t("description")} />

          <div className="mx-auto mb-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm sm:items-center sm:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
              <Settings2 size={18} aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-muted">
              <strong className="font-semibold text-foreground">{t("setup.label")}</strong>{" "}
              {t("setup.value")}
            </p>
          </div>

          <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {plans.map((plan, i) => {
              const discount = calculateDiscount(i);
              const originalPrice = parseInt(plan.price.replace(/[^0-9]/g, ""));
              const discountedPrice = Math.round(originalPrice * (1 - discount / 100));
              const monthlySavings = originalPrice - discountedPrice;
              const annualSavings = monthlySavings * 12;

              return (
                <ScrollReveal
                  key={plan.name}
                  direction="up"
                  delay={i * 0.08}
                  className={cn(
                    "flex min-w-0",
                    i === 2 && "md:col-span-2 md:w-full md:max-w-md md:justify-self-center xl:col-span-1 xl:max-w-none",
                  )}
                >
                  <article
                    className={cn(
                      "relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border bg-card p-5 shadow-[0_18px_48px_rgba(2,6,23,0.07)] transition-[transform,border-color,box-shadow] duration-300 sm:p-6",
                      plan.featured
                        ? "border-foreground/25 shadow-[0_22px_58px_rgba(2,6,23,0.12)]"
                        : "border-border hover:-translate-y-0.5 hover:border-foreground/20",
                    )}
                  >
                    {plan.featured ? (
                      <div className="absolute inset-x-0 top-0 h-1 bg-foreground" aria-hidden="true" />
                    ) : null}

                    <div className="flex min-h-12 items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {plan.name}
                      </h3>
                      {plan.badge ? (
                        <span className="max-w-[9rem] rounded-full border border-foreground/15 bg-foreground/[0.06] px-3 py-1.5 text-right text-[0.62rem] font-bold uppercase leading-tight tracking-[0.12em] text-foreground">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 border-b border-border/75 pb-5">
                      <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
                        <span className="min-w-0 text-[clamp(2.35rem,5vw,3.35rem)] font-bold leading-none tracking-[-0.045em] text-foreground">
                          {discountedPrice.toLocaleString(numberLocale)}
                        </span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          {plan.currency.trim()} {t("perMonth")}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <span className="text-sm text-muted">
                          <span className="line-through decoration-foreground/35">
                            {originalPrice.toLocaleString(numberLocale)} {plan.currency.trim()}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {t("saveLabel", {
                            savings: annualSavings.toLocaleString(numberLocale),
                            currency: plan.currency.trim(),
                            percent: discount,
                          })}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted/80">
                        {t("totalCommitment", {
                          total: discountedPrice * planOptions[i],
                          currency: plan.currency.trim(),
                        })}
                      </p>
                    </div>

                    <fieldset className="mt-5">
                      <legend className="mb-2.5 text-xs font-semibold text-foreground">
                        {t("upfrontLabel")}
                      </legend>
                      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/55 p-1">
                        {[3, 6, 12].map((months) => {
                          const discountPercent = months === 12 ? 12 : months === 6 ? 7 : 2;
                          const isSelected = planOptions[i] === months;
                          return (
                            <button
                              key={months}
                              type="button"
                              onClick={() => updatePlanOption(i, months)}
                              aria-label={`${plan.name}: ${months}${t("monthsLabel")}, -${discountPercent}%`}
                              aria-pressed={isSelected}
                              className={cn(
                                "min-h-12 touch-manipulation rounded-lg px-2 py-1.5 text-center transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35",
                                isSelected
                                  ? "bg-foreground text-background shadow-sm"
                                  : "text-muted hover:bg-foreground/[0.05] hover:text-foreground",
                              )}
                            >
                              <span className="block text-sm font-bold">
                                {months}{t("monthsLabel")}
                              </span>
                              <span className={cn("mt-0.5 block text-[0.65rem] font-semibold", isSelected ? "text-background/70" : "text-muted/75")}>
                                -{discountPercent}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <ul className="my-6 flex-1 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                            <Check size={12} strokeWidth={3} aria-hidden="true" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      href={getWhatsAppOnboardingUrl(plan, planOptions[i], discountedPrice, discount, annualSavings)}
                      variant={plan.featured ? "primary" : "secondary"}
                      className="w-full"
                      external
                    >
                      {t("cta")}
                    </Button>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <div className="mt-16 space-y-8">
          <ScrollReveal direction="up">
            <GlowCard className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h3 className="text-xl font-semibold text-foreground">{t("customProposal.title")}</h3>
                <span className="inline-block self-start rounded-full border border-accent/40 bg-accent/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                  {t("customProposal.badge")}
                </span>
              </div>
              <p className="text-muted text-sm leading-relaxed">{t("customProposal.description")}</p>
            </GlowCard>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal direction="up" delay={0.05}>
              <GlowCard className="p-6 h-full">
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("installation.title")}</h3>
                <p className="text-2xl font-bold text-accent">{t("installation.price")}</p>
              </GlowCard>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <GlowCard className="p-6 h-full">
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("cloudBridge.title")}</h3>
                <p className="text-sm text-muted mb-1">{t("cloudBridge.depositLabel")}</p>
                <p className="text-2xl font-bold text-accent mb-3">{t("cloudBridge.deposit")}</p>
                <p className="text-sm text-muted leading-relaxed">{t("cloudBridge.description")}</p>
              </GlowCard>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="up" delay={0.15}>
            <GlowCard className="p-6 md:p-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">{t("freeAssessment.title")}</h3>
              <p className="text-muted text-sm mb-4">{t("freeAssessment.description")}</p>
              <ul className="space-y-2">
                {(t.raw("freeAssessment.items") as string[]).map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-foreground">
                    <Check size={16} className="text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlowCard>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <GlowCard className="p-6 md:p-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">{t("otherServices.title")}</h3>
              <p className="text-muted text-sm mb-4">{t("otherServices.description")}</p>
              <ul className="space-y-2">
                {(t.raw("otherServices.items") as string[]).map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-foreground">
                    <Check size={16} className="text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlowCard>
          </ScrollReveal>

          <div className="text-center">
            <Button href="/contact" size="lg">
              {t("proposalCta")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
