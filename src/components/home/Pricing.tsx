"use client";

import { useState } from "react";
import ScrollReveal from "@/components/animations/ScrollReveal";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
    const phone = "258842870793";
    const planName = plan.badge ? `${plan.name} (${plan.badge})` : plan.name;
    const upfrontMonths = `${months} ${t("monthsLabel")}`;
    const formattedDiscount = discount > 0 ? `${discount}%` : "0%";
    const monthlyRate = `${discountedPrice.toLocaleString()} ${plan.currency.trim()}/month`;
    const totalDue = `${(discountedPrice * months).toLocaleString()} ${plan.currency.trim()}`;
    const annualSaveText = discount > 0 ? `${annualSavings.toLocaleString()} ${plan.currency.trim()}/year` : "0 MZN/year";

    const text = `Hello Overwatch Team,

I would like to initialize onboarding for the following security monitoring plan:

📋 Plan Details:
• Plan: *${planName}*
• Upfront Payment Period: *${upfrontMonths}*
• Discount Applied: *${formattedDiscount}*
• Monthly Rate: *${monthlyRate}*
• Upfront Commitment Total: *${totalDue}*
• Annual Savings: *${annualSaveText}*

🔧 Standard Setup Fees:
• 2,500 MZN installation fee
• 4,000 MZN hardware deposit

Please let me know the next steps to schedule our site assessment and setup.

Thank you!`;

    return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(text)}`;
  };

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} description={t("description")} />

        <div className="text-center mb-12">
          <div className="inline-block rounded-lg border border-accent/30 bg-accent/5 px-5 py-3 text-sm">
            <strong className="text-accent">{t("setup.label")}</strong>{" "}
            <span className="text-muted">{t("setup.value")}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {plans.map((plan, i) => {
            const discount = calculateDiscount(i);
            const originalPrice = parseInt(plan.price.replace(/[^0-9]/g, ''));
            const discountedPrice = Math.round(originalPrice * (1 - discount / 100));
            const monthlySavings = originalPrice - discountedPrice;
            const annualSavings = monthlySavings * 12;

            return (
              <ScrollReveal
                key={plan.name}
                direction="up"
                delay={i * 0.1}
                className="relative flex"
              >
                {plan.badge && (
                  <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 z-20 bg-accent text-primary-dark text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded shadow-lg">
                    {plan.badge}
                  </span>
                )}
                <GlowCard
                  className={cn(
                    "h-full w-full flex flex-col transition-all duration-500",
                    !plan.featured && "border-border/60 hover:border-accent/40 bg-card/45",
                    plan.featured && "border-accent border-2 bg-card/95 shadow-2xl shadow-accent/10 lg:scale-[1.04] lg:-translate-y-2 z-10"
                  )}
                  hover={!plan.featured}
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>

                  {/* Price Display */}
                  <div className="mb-4">
                    {discount > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl text-foreground/50 line-through">
                          {originalPrice.toLocaleString()}
                        </span>
                        <span className="text-4xl font-bold text-accent">
                          {discountedPrice.toLocaleString()}
                        </span>
                        <span className="text-foreground text-sm ml-1">{plan.currency}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-foreground">
                          {plan.price}
                        </span>
                        <span className="text-foreground text-sm ml-1">{plan.currency}</span>
                      </div>
                    )}
                    <div className="text-sm text-muted mt-0.5">
                      {t("perMonth")}
                    </div>
                    {discount > 0 && (
                      <div className="text-sm text-accent font-semibold mt-1">
                        {t("saveLabel", { savings: annualSavings.toLocaleString(), currency: plan.currency.trim(), percent: discount })}
                      </div>
                    )}
                    <div className="text-xs text-foreground/60 mt-1">
                      {t("totalCommitment", { total: (discount > 0 ? discountedPrice : originalPrice) * planOptions[i], currency: plan.currency.trim() })}
                    </div>
                  </div>

                  {/* Discount Options */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      {t("upfrontLabel")}
                    </label>
                    <div className="flex gap-1">
                      {[3, 6, 12].map((months) => {
                        const discountPercent = months === 12 ? 12 : months === 6 ? 7 : 2;
                        return (
                          <button
                            key={months}
                            onClick={() => updatePlanOption(i, months)}
                            className={cn(
                              "flex-1 py-2 px-2 rounded border text-xs font-semibold transition-all cursor-pointer",
                              planOptions[i] === months
                                ? "bg-accent text-primary-dark border-accent"
                                : "bg-primary-darker/50 text-foreground border-border hover:border-accent/50"
                            )}
                          >
                            {months}{t("monthsLabel")} {t("percentOff", { percent: discountPercent })}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-foreground">
                        <Check size={16} className="text-accent shrink-0 mt-0.5" />
                        {feature}
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
                </GlowCard>
              </ScrollReveal>
            );
          })}
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
