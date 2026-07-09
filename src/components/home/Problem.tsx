"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ParallaxImage from "@/components/animations/ParallaxImage";

export default function Problem() {
  const t = useTranslations("problem");
  const quietRisks = t.raw("quietRisks.items") as string[];
  const passiveCost = t.raw("passiveCost.items") as string[];

  return (
    <section id="about" className="py-20 md:py-28 bg-primary-darker/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up">
          <SectionHeader title={t("title")} />
        </ScrollReveal>

        {/* Split Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch mb-16">
          <ScrollReveal direction="left" delay={0.1}>
            <GlowCard techCorners={true} accentColor="gold" className="h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4 glow-text">
                  {t("quietRisks.title")}
                </h3>
                <p className="text-muted text-sm leading-relaxed mb-4">
                  {t("quietRisks.description")}
                </p>
                <ul className="space-y-2 mb-6">
                  {quietRisks.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-accent shrink-0 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlowCard>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.2}>
            <GlowCard techCorners={true} accentColor="slate" className="h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4 glow-text">
                  {t("passiveCost.title")}
                </h3>
                <p className="text-muted text-sm leading-relaxed mb-4">
                  {t("passiveCost.description")}
                </p>
                <ul className="space-y-2 mb-6">
                  {passiveCost.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-muted/80 shrink-0 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-border/40 text-sm text-accent font-medium uppercase tracking-wider">
                {t("passiveCost.outro")}
              </div>
            </GlowCard>
          </ScrollReveal>
        </div>

        {/* Quote & Image Row */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left" delay={0.1}>
            <blockquote className="border-l-2 border-accent pl-5 text-foreground/90 font-medium text-lg leading-relaxed whitespace-pre-line">
              {t("quote")}
            </blockquote>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.2}>
            <ParallaxImage
              className="relative aspect-[4/3] rounded-xl border border-border"
              speed={0.15}
            >
              <Image
                src="/monitoring.webp"
                alt=""
                fill
                className="object-cover rounded-xl"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </ParallaxImage>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}


