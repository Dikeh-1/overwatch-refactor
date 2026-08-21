"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import {
  getGoogleMapsUrl,
  getSiteAddress,
  siteContact,
  solutionNavigationLinks,
} from "@/lib/site-config";

const socialLinks = [
  {
    name: "WhatsApp",
    href: `https://wa.me/${siteContact.whatsappNumber}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/overwatchmoz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/overwatch_moz/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61589576463721",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tMeta = useTranslations("metadata");
  const tSections = useTranslations("navSections");
  const locale = useLocale();
  const year = new Date().getFullYear();
  const location = getSiteAddress(locale);
  const mapHref = getGoogleMapsUrl(locale);

  const footerSections = [
    {
      titleKey: "solutions" as const,
      links: solutionNavigationLinks,
    },
    {
      titleKey: "company" as const,
      links: [
        { href: "/about", key: "about" as const },
        { href: "/careers", key: "careers" as const },
        { href: "/", key: "home" as const },
      ],
    },
    {
      titleKey: "resources" as const,
      links: [
        { href: "/faq", key: "faq" as const },
        { href: "/contact", key: "contact" as const },
      ],
    },
  ];

  return (
    <footer className="dark relative overflow-hidden border-t border-white/10 bg-[#0b0f18] text-white">
      <div className="absolute inset-0 hex-pattern opacity-25" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex min-h-11 items-center" aria-label="Overwatch home">
              <Logo size="sm" />
            </Link>
            <p className="mt-5 max-w-sm text-base font-medium leading-relaxed text-white/68">
              {t("description")}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/48">
              {tMeta("tagline")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 text-white/60 transition-colors hover:border-white/30 hover:bg-white/8 hover:text-white"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-5" aria-label="Footer navigation">
            {footerSections.map((section) => (
              <div key={section.titleKey}>
                <h3 className="text-xs font-bold uppercase tracking-[0.17em] text-white/45">
                  {tSections(section.titleKey)}
                </h3>
                <ul className="mt-4 space-y-1">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-11 items-center text-sm font-medium text-white/76 transition-colors hover:text-white"
                      >
                        {section.titleKey === "solutions" && link.key === "business"
                          ? t("solutionLinks.business")
                          : section.titleKey === "solutions" && link.key === "homes"
                            ? t("solutionLinks.homes")
                            : tNav(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.17em] text-white/45">
              {t("contact")}
            </h3>
            <div className="mt-5 space-y-4">
              <a
                href={`mailto:${siteContact.email}`}
                className="group flex min-h-11 items-start gap-3 text-sm text-white/76 transition-colors hover:text-white"
              >
                <Mail size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="break-all">{siteContact.email}</span>
              </a>
              <a
                href={`tel:${siteContact.phoneHref}`}
                className="group flex min-h-11 items-start gap-3 text-sm text-white/76 transition-colors hover:text-white"
              >
                <Phone size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span>{siteContact.phone}</span>
              </a>
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-11 items-start gap-3 rounded-lg text-sm leading-relaxed text-white/62 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0f18]"
                aria-label={`${t("openMap")}: ${location}`}
              >
                <MapPin size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="underline decoration-white/0 underline-offset-4 transition-colors group-hover:decoration-white/45">
                  {location}
                </span>
                <ExternalLink
                  size={14}
                  className="mt-0.5 shrink-0 text-white/35 transition-colors group-hover:text-white/75"
                  aria-hidden="true"
                />
              </a>
            </div>

            <Button href="/contact#assessment-form" size="sm" className="mt-6 w-full sm:w-auto lg:w-full">
              {tNav("cta")}
              <ArrowRight size={16} className="ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-7 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Overwatch. {t("rights")}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="flex min-h-11 items-center transition-colors hover:text-white">
              {t("legal.privacy")}
            </Link>
            <Link href="/terms" className="flex min-h-11 items-center transition-colors hover:text-white">
              {t("legal.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
