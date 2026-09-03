"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Building2, Home } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import Button from "@/components/ui/Button";

export default function AudiencePreview() {
  const tBusiness = useTranslations("business");
  const tHomes = useTranslations("homes");

  return (
    <section className="py-20 md:py-28 bg-primary-darker/50">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 1, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <GlowCard className="h-full">
              <Building2 className="text-accent mb-4" size={40} />
              <span className="text-accent text-sm font-semibold tracking-widest uppercase">
                {tBusiness("label")}
              </span>
              <h3 className="text-2xl font-bold text-foreground mt-2 mb-3">
                {tBusiness("title")}
              </h3>
              <p className="text-muted mb-6 leading-relaxed">{tBusiness("description")}</p>
              <Button href="/business" variant="secondary">
                {tBusiness("cta")}
              </Button>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <GlowCard className="h-full">
              <Home className="text-accent mb-4" size={40} />
              <span className="text-accent text-sm font-semibold tracking-widest uppercase">
                {tHomes("label")}
              </span>
              <h3 className="text-2xl font-bold text-foreground mt-2 mb-3">
                {tHomes("title")}
              </h3>
              <p className="text-muted mb-6 leading-relaxed">{tHomes("description")}</p>
              <Button href="/homes" variant="secondary">
                {tHomes("cta")}
              </Button>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
