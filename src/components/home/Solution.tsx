"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Scan, Eye, Siren, FileText } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";
import { IMAGES } from "@/lib/constants";

const stepIcons = [Scan, Eye, Siren, FileText];
const stepKeys = ["monitor", "verify", "deter", "document"] as const;

export default function Solution() {
  const t = useTranslations("solution");

  return (
    <section id="how" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 tech-grid opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title={t("title")} description={t("description")} />

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28"
          >
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-border">
              <Image
                src={IMAGES.process}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-primary-dark/20" />
            </div>
          </motion.div>

          <div className="space-y-4">
            {stepKeys.map((key, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <GlowCard className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center text-accent text-sm font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="text-accent" size={18} />
                        <h3 className="text-lg font-semibold text-foreground">
                          {t(`steps.${key}.title`)}
                        </h3>
                      </div>
                      <p className="text-muted text-sm leading-relaxed">
                        {t(`steps.${key}.description`)}
                      </p>
                    </div>
                  </GlowCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
