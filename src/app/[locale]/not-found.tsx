import { ArrowRight, Home, Radar, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");
  const tNav = useTranslations("nav");
  const suggestions = t.raw("suggestions") as string[];

  return (
    <section className="relative isolate min-h-[78vh] overflow-hidden bg-primary-dark px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_18%_75%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,#0f1117_0%,#111827_58%,#06101d_100%)]" />
      <div className="contact-particle-field absolute inset-0 -z-10 opacity-45" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
            <ShieldAlert size={15} />
            {t("routeUnavailable")}
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
            404
            <span className="mt-3 block text-white/82">{t("title")}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
            {t("description")} {t("extendedDescription")}
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button href="/" size="lg" className="gap-2">
              <Home size={18} />
              {t("back")}
            </Button>
            <Button href="/contact" variant="secondary" size="lg" className="gap-2">
              {tNav("contact")}
              <ArrowRight size={18} />
            </Button>
          </div>

          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {suggestions.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/10"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="group relative mx-auto aspect-square w-full max-w-[420px] rounded-full border border-white/12 bg-white/[0.03] shadow-[0_0_100px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-5 rounded-full border border-white/10" />
          <div className="absolute inset-16 rounded-full border border-white/10" />
          <div className="absolute inset-28 rounded-full border border-white/10" />
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,rgba(255,255,255,0.22),transparent_22%,transparent)] transition duration-700 group-hover:rotate-45" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-36 w-36 place-items-center rounded-full border border-white/15 bg-primary-dark/80 backdrop-blur">
              <Radar size={42} className="text-white/70" />
              <span className="text-4xl font-black text-white">404</span>
            </div>
          </div>
          <span className="absolute left-[28%] top-[24%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.9)]" />
          <span className="absolute right-[22%] top-[44%] h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_22px_rgba(255,255,255,0.75)]" />
          <span className="absolute bottom-[24%] left-[44%] h-2.5 w-2.5 rounded-full bg-white/80 shadow-[0_0_22px_rgba(255,255,255,0.8)]" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 -z-10 h-32 bg-gradient-to-t from-background to-transparent" />

      <Link
        href="/"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-primary-dark"
      >
        {t("back")}
      </Link>
    </section>
  );
}
