import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import TechGrid from "@/components/ui/TechGrid";

export default async function CTABanner() {
  const t = await getTranslations("cta");
  const items = t.raw("items") as string[];

  return (
    <section id="contact" className="dark relative overflow-hidden bg-[#0b0f18] py-14 text-white sm:py-16 lg:py-24">
      <TechGrid className="absolute inset-0 opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(59,130,246,0.11),transparent_34%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mobile-flat-surface overflow-hidden rounded-3xl border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                <ShieldCheck size={16} className="text-accent" aria-hidden="true" />
                {t("eyebrow")}
              </div>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {t("title")}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/72 sm:text-lg">
                {t("description")}
              </p>
              <Button
                href="/contact#assessment-form"
                size="lg"
                className="mt-7 w-full bg-white px-5 text-sm text-[#0b0f18] hover:bg-white/90 sm:w-auto sm:px-8 sm:text-lg"
              >
                {t("button")}
                <ArrowRight size={18} className="ml-2" aria-hidden="true" />
              </Button>
            </div>

            <div className="mobile-flat-surface rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-6">
              <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {items.map((item) => (
                  <li
                    key={item}
                    className="mobile-flat-row flex min-h-14 items-start gap-3 rounded-xl border border-white/8 bg-white/[0.045] p-4 text-sm font-medium leading-relaxed text-white/82 last:border-b-0"
                  >
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
