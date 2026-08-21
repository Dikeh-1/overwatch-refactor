import type { Metadata } from "next";
import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Button from "@/components/ui/Button";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";
import ContactForm from "@/components/shared/ContactForm";
import { WHATSAPP_URL } from "@/lib/constants";
import { getGoogleMapsUrl, getSiteAddress, siteContact } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.contact" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    alternates: {
      canonical: `/${locale}/contact`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/contact`]),
      ),
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const intro = t("description").split("\n\n")[0];
  const trust = t.raw("hero.trust") as string[];
  const address = getSiteAddress(locale);

  const contactDetails = [
    {
      label: t("details.email"),
      value: siteContact.email,
      href: `mailto:${siteContact.email}`,
      icon: Mail,
      external: false,
    },
    {
      label: t("details.phone"),
      value: siteContact.phone,
      href: `tel:${siteContact.phoneHref}`,
      icon: Phone,
      external: false,
    },
    {
      label: t("details.whatsapp"),
      value: siteContact.phone,
      href: WHATSAPP_URL,
      icon: MessageCircle,
      external: true,
    },
    {
      label: t("details.location"),
      value: address,
      href: getGoogleMapsUrl(locale),
      icon: MapPin,
      external: true,
    },
  ];

  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-[#0b0e14] pb-16 pt-28 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_13%_23%,rgba(255,255,255,0.09),transparent_30%),radial-gradient(circle_at_86%_38%,rgba(59,130,246,0.12),transparent_34%)]" />
        <div className="absolute inset-0 tech-grid opacity-32" />
        <div className="absolute -right-32 top-16 h-[34rem] w-[34rem] rounded-full border border-white/[0.05]" />
        <div className="absolute -right-10 top-36 h-[24rem] w-[24rem] rounded-full border border-white/[0.06]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <span className={darkEyebrowClassName}>
              <MessageCircle size={14} className="shrink-0" aria-hidden="true" />
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-6 text-balance text-[clamp(2.5rem,8vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base font-medium leading-relaxed text-white/70 sm:text-lg lg:text-xl">
              {intro}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href="#assessment-form"
                size="lg"
                className="w-full whitespace-nowrap bg-white px-4 text-[clamp(0.68rem,3.5vw,0.875rem)] text-[#0b0e14] hover:bg-white/90 sm:w-auto sm:px-5 sm:text-sm"
              >
                {t("hero.primaryCta")}
                <ArrowDown size={17} className="ml-2" aria-hidden="true" />
              </Button>
              <Button
                href={WHATSAPP_URL}
                size="lg"
                variant="secondary"
                className="w-full whitespace-nowrap border-white/25 px-4 text-[clamp(0.68rem,3.5vw,0.875rem)] text-white hover:border-white/55 hover:bg-white/[0.07] sm:w-auto sm:px-5 sm:text-sm"
                external
              >
                {t("hero.secondaryCta")}
              </Button>
            </div>

            <ul className="mt-8 grid gap-3 text-sm text-white/68 sm:grid-cols-3">
              {trust.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-white/80"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl pb-7 [perspective:1300px] lg:max-w-none">
            <div className="absolute inset-x-8 bottom-0 top-14 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] [transform:translate3d(0,24px,-90px)]" />
            <div className="absolute inset-x-4 bottom-3 top-8 rounded-[2rem] border border-white/[0.09] bg-white/[0.035] [transform:translate3d(0,12px,-40px)]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#151a24]/95 p-4 shadow-[0_38px_90px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6 lg:[transform:rotateY(-3deg)_rotateX(1deg)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.17em] text-white/42">
                    {t("hero.cardLabel")}
                  </p>
                  <p className="mt-1.5 text-base font-semibold text-white sm:text-lg">
                    {t("hero.cardTitle")}
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-white/82">
                  <ShieldCheck size={21} aria-hidden="true" />
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {contactDetails.map((detail) => {
                  const Icon = detail.icon;
                  return (
                    <a
                      key={detail.label}
                      href={detail.href}
                      target={detail.external ? "_blank" : undefined}
                      rel={detail.external ? "noopener noreferrer" : undefined}
                      className="group flex min-h-24 items-start gap-3 rounded-2xl border border-white/[0.085] bg-white/[0.045] p-4 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.065] text-white/75">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.62rem] font-bold uppercase tracking-[0.15em] text-white/40">
                          {detail.label}
                        </span>
                        <span className="mt-1.5 flex items-start gap-1.5 break-words text-sm font-semibold leading-relaxed text-white/82">
                          {detail.value}
                          {detail.external ? (
                            <ExternalLink size={13} className="mt-1 shrink-0 text-white/40" aria-hidden="true" />
                          ) : null}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="assessment-form"
        className="relative scroll-mt-20 overflow-hidden bg-background py-16 sm:py-20 lg:py-28"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(59,130,246,0.05),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/65">
              {t("formSection.eyebrow")}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t("formSection.title")}
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">
              {t("formSection.description")}
            </p>
          </div>

          <div className="mt-10 lg:mt-14">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
