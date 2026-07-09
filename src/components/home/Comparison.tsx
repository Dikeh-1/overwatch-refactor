"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/animations/ScrollReveal";

export default function Comparison() {
  const t = useTranslations("comparison");
  const rows = t.raw("rows") as { traditional: string; overwatch: string }[];

  return (
    <section className="py-20 md:py-28 border-t border-border bg-primary-dark/20 relative">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} />

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Traditional CCTV column */}
          <ScrollReveal direction="left" delay={0.1}>
            <GlowCard techCorners={true} accentColor="slate" className="h-full border-border hover:border-accent/20 bg-primary-darker/20">
              <h3 className="text-xl font-bold text-muted mb-6 text-center tracking-wide uppercase">
                {t("headers.traditional")}
              </h3>
              <ul className="space-y-4">
                {rows.map((row, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-foreground/70 py-2 border-b border-border/20 last:border-0"
                  >
                    <X className="text-muted shrink-0 mt-0.5" size={16} />
                    <span>{row.traditional}</span>
                  </li>
                ))}
              </ul>
            </GlowCard>
          </ScrollReveal>

          {/* Overwatch column */}
          <ScrollReveal direction="right" delay={0.2}>
            <GlowCard techCorners={true} accentColor="gold" className="h-full border-accent/30 bg-accent/5 glow-accent">
              <h3 className="text-xl font-bold text-accent mb-6 text-center tracking-wide uppercase glow-text">
                {t("headers.overwatch")}
              </h3>
              <ul className="space-y-4">
                {rows.map((row, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-foreground py-2 border-b border-border/20 last:border-0"
                  >
                    <Check className="text-accent shrink-0 mt-0.5 animate-pulse" size={16} />
                    <span className="font-medium">{row.overwatch}</span>
                  </li>
                ))}
              </ul>
            </GlowCard>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
