"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import TechGrid from "@/components/ui/TechGrid";
import ScrollReveal from "@/components/animations/ScrollReveal";
import { IMAGES } from "@/lib/constants";

export default function CTABanner() {
  const t = useTranslations("cta");

  return (
    <section id="contact" className="py-20 md:py-28 relative overflow-hidden dark bg-[#0f1117]">
      <TechGrid className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t("title")}
            </h2>
            <p className="text-muted text-lg leading-relaxed mb-8 whitespace-pre-line">{t("description")}</p>
            <Button href="/contact" size="lg" variant="secondary">
              {t("button")}
            </Button>
          </ScrollReveal>

          <ScrollReveal direction="scale" delay={0.2} className="rounded-xl overflow-hidden border border-border shadow-2xl">
            <video
              className="w-full h-auto block"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={IMAGES.ctaVideoPoster}
            >
              <source src={IMAGES.ctaVideoSrc} type="video/mp4" />
            </video>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
