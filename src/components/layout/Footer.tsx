"use client";

import { useTranslations } from "next-intl";
import { Mail, Phone, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";

const socialLinks = [
  {
    name: "WhatsApp",
    href: "https://wa.me/258842870793",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/overwatchmoz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
        <rect x="2" y="9" width="4" height="12"></rect>
        <circle cx="4" cy="4" r="2"></circle>
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/overwatch_moz/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61589576463721",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
];

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tContact = useTranslations("contact.info");
  const tMeta = useTranslations("metadata");
  const tCta = useTranslations("cta");
  const tSections = useTranslations("navSections");
  const year = new Date().getFullYear();

  const footerSections = [
    {
      titleKey: "solutions" as const,
      links: [
        { href: "/business", key: "business" as const, descKey: "business" as const },
        { href: "/homes", key: "homes" as const, descKey: "homes" as const },
      ],
    },
    {
      titleKey: "company" as const,
      links: [
        { href: "/about", key: "about" as const, descKey: "about" as const },
        { href: "/careers", key: "careers" as const, descKey: "careers" as const },
        { href: "/", key: "home" as const, descKey: "home" as const },
      ],
    },
    {
      titleKey: "resources" as const,
      links: [
        { href: "/faq", key: "faq" as const, descKey: "faq" as const },
        { href: "/contact", key: "contact" as const, descKey: "contact" as const },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-border bg-primary-darker overflow-hidden dark">
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Background tech pattern */}
      <div className="absolute inset-0 hex-pattern opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Top section: Logo + Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mb-12 pb-12 border-b border-border/50">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity cursor-pointer">
              <Logo size="sm" />
            </Link>
            <p className="mt-4 text-muted text-sm leading-relaxed max-w-sm">
              {t("description")}
            </p>
            <p className="mt-3 text-accent text-sm font-medium">{tMeta("tagline")}</p>

            {/* Social links */}
            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-border text-muted hover:text-accent hover:border-accent hover:bg-accent/5 transition-all duration-300"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {footerSections.map((section) => (
              <div key={section.titleKey}>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  {tSections(section.titleKey)}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group"
                      >
                        <div className="text-foreground hover:text-accent text-sm font-medium transition-colors">
                          {tNav(link.key)}
                        </div>
                        <div className="text-muted text-xs mt-0.5 group-hover:text-accent/70 transition-colors">
                          {tNav(`descriptions.${link.descKey}`)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA column */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              {tNav("cta")}
            </h3>
            <p className="text-foreground text-sm mb-4 leading-relaxed">
              {tCta("description")}
            </p>
            <div className="flex flex-col items-start gap-3">
              <Button href="/contact" size="sm" className="w-full sm:w-auto group">
                {tNav("cta")}
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button 
                href="https://wa.me/258842870793" 
                variant="secondary" 
                size="sm"
                className="w-full sm:w-auto group whitespace-nowrap"
                external
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {tNav("whatsapp")}
                <ExternalLink size={14} className="ml-2 text-muted group-hover:text-foreground transition-colors" />
              </Button>
            </div>
          </div>
        </div>

        {/* Middle section: Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 shrink-0">
              <Mail size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-0.5">{t("labels.email")}</p>
              <a
                href={`mailto:${tContact("email")}`}
                className="text-foreground hover:text-accent text-sm transition-colors"
              >
                {tContact("email")}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 shrink-0">
              <Phone size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-0.5">{t("labels.phone")}</p>
              <a
                href={`tel:${tContact("phone").replace(/\s/g, "")}`}
                className="text-foreground hover:text-accent text-sm transition-colors"
              >
                {tContact("phone")}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 shrink-0">
              <MapPin size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-0.5">{t("labels.location")}</p>
              <p className="text-foreground text-sm">{tContact("location")}</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted text-sm">
            © {year} Overwatch. {t("rights")}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-muted hover:text-accent text-xs transition-colors"
            >
              {t("legal.privacy")}
            </Link>
            <span className="text-border/50 text-xs">|</span>
            <Link
              href="/terms"
              className="text-muted hover:text-accent text-xs transition-colors"
            >
              {t("legal.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
