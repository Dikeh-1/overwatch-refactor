"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const localeLabels: Record<Locale, string> = {
  en: "EN",
  pt: "PT",
};

export default function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border overflow-hidden",
        className
      )}
      role="group"
      aria-label="Language switcher"
    >
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          href={pathname}
          locale={loc}
          className={cn(
            "flex min-h-11 min-w-11 items-center justify-center px-3 py-2 text-sm font-medium transition-colors",
            locale === loc
              ? "bg-accent/20 text-accent"
              : "text-muted hover:text-foreground hover:bg-accent/10"
          )}
          aria-current={locale === loc ? "true" : undefined}
        >
          {localeLabels[loc]}
        </Link>
      ))}
    </div>
  );
}
