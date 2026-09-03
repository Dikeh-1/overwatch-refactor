"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import GlowCard from "@/components/ui/GlowCard";

type Testimonial = {
  quote: string;
  author: string;
  company: string;
};

export default function Testimonials() {
  const t = useTranslations("testimonials");
  const items = t.raw("items") as Testimonial[];

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
        <SectionHeader title={t("title")} />

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.author}
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlowCard className="h-full flex flex-col">
                <Quote className="text-accent/40 mb-4" size={32} />
                <p className="text-foreground leading-relaxed flex-1 mb-6 italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-sm text-muted">{item.company}</p>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
