"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import ThemeDropdown from "./ThemeDropdown";
import LanguageDropdown from "./LanguageDropdown";
import { cn } from "@/lib/utils";

const navLinks = [{ href: "/", key: "home" as const }];

const dropdownMenus = [
  {
    titleKey: "solutions" as const,
    links: [
      { href: "/solutions", key: "allSolutions" as const },
      { href: "/business", key: "business" as const },
      { href: "/homes", key: "homes" as const },
    ],
  },
  {
    titleKey: "company" as const,
    links: [
      { href: "/about", key: "about" as const },
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

export default function Navbar() {
  const t = useTranslations("nav");
  const tNavSections = useTranslations("navSections");
  const tMobile = useTranslations("mobileMenu");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [currentHash, setCurrentHash] = useState(
    typeof window === "undefined" ? "" : window.location.hash,
  );

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Scroll effect & Section Spy
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      if (window.scrollY < 100) {
        setCurrentHash("");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Intersection Observer for Pricing section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentHash("#pricing");
          }
        });
      },
      { threshold: 0.2 }
    );

    const timeoutId = setTimeout(() => {
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) observer.observe(pricingSection);
    }, 500);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      const targetHash = href.substring(1);
      return pathname === "/" && currentHash === `#${targetHash}`;
    }
    if (href === "/") return pathname === "/" && !currentHash;
    return pathname.startsWith(href);
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState<string | null>(
    null,
  );
  const [openMobileDropdowns, setOpenMobileDropdowns] = useState<Set<string>>(
    new Set(),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isMobile = false) => {
    if (href.includes("#") && pathname === "/") {
      e.preventDefault();
      const targetId = href.substring(href.indexOf("#") + 1);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setCurrentHash(`#${targetId}`);
      }
    }
    if (isMobile) {
      closeMobileMenu();
    }
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDesktopDropdown(null);
      }
    };

    if (openDesktopDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDesktopDropdown]);

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setOpenMobileDropdowns(new Set());
  };

  const toggleMobileDropdown = (title: string) => {
    const newOpen = new Set(openMobileDropdowns);
    if (newOpen.has(title)) {
      newOpen.delete(title);
    } else {
      newOpen.add(title);
    }
    setOpenMobileDropdowns(newOpen);
  };

  const handleDesktopDropdownClick = (title: string) => {
    setOpenDesktopDropdown(openDesktopDropdown === title ? null : title);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-primary-dark/95 backdrop-blur-md border-b border-border shadow-lg"
            : "bg-transparent dark",
        )}
      >
        <nav
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        aria-label={t("aria.mainNav")}
      >
        <div className="flex h-16 md:h-20 items-center justify-between">
          <Link href="/" className="shrink-0" onClick={closeMobileMenu}>
            <Logo size="sm" preload />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            {/* Standalone Links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group relative px-4 py-2 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "text-accent"
                    : "text-foreground/80 hover:text-accent"
                )}
                onClick={(e) => handleNavClick(e, link.href)}
              >
                {t(link.key)}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full" />
              </Link>
            ))}

            {/* Dropdown Menus */}
            {dropdownMenus.map((menu) => (
              <div key={menu.titleKey} className="relative group">
                <button
                  onClick={() => handleDesktopDropdownClick(menu.titleKey)}
                  onMouseEnter={() => setOpenDesktopDropdown(menu.titleKey)}
                  onMouseLeave={() => setOpenDesktopDropdown(null)}
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors",
                    menu.links.some((l) => isActive(l.href))
                      ? "text-accent"
                      : "text-foreground/80 hover:text-accent"
                  )}
                  aria-expanded={openDesktopDropdown === menu.titleKey}
                  aria-haspopup="true"
                >
                  {tNavSections(menu.titleKey)}
                  <ChevronDown
                    size={14}
                    className={cn(
                      "transition-transform",
                      openDesktopDropdown === menu.titleKey ? "rotate-180" : "",
                    )}
                  />
                </button>

                {/* Dropdown Content */}
                <div
                  className={cn(
                    "absolute top-full left-0 mt-0 w-48 bg-primary-darker/95 backdrop-blur-md border border-border rounded-lg shadow-xl py-2 z-50",
                    "opacity-0 invisible transition-all duration-200 group-hover:opacity-100 group-hover:visible",
                    openDesktopDropdown === menu.titleKey && "opacity-100 visible",
                  )}
                  onMouseEnter={() => setOpenDesktopDropdown(menu.titleKey)}
                  onMouseLeave={() => setOpenDesktopDropdown(null)}
                >
                  {menu.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "block px-4 py-2 text-sm hover:bg-accent/5 transition-colors",
                        isActive(link.href)
                          ? "text-accent"
                          : "text-foreground hover:text-accent"
                      )}
                      onClick={(e) => {
                        setOpenDesktopDropdown(null);
                        handleNavClick(e, link.href);
                      }}
                    >
                      <div className="font-medium">{t(link.key)}</div>
                      <div className="text-xs text-foreground/50">
                        {t(`descriptions.${link.key}`)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <ThemeDropdown />
            <LanguageDropdown />
            <Button href="/contact#assessment-form" size="sm">
              {t("cta")}
            </Button>
          </div>

          {/* Mobile: Only Hamburger */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              className="p-2 text-foreground hover:text-accent transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t("aria.closeMenu") : t("aria.openMenu")}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>
    </header>

      {/* Mobile Menu - Moved outside header to prevent backdrop-filter from creating a containing block that collapses its fixed height */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-primary-dark/98 backdrop-blur-lg z-40 overflow-auto">
          <div className="flex flex-col p-6 gap-2">
            {/* Standalone Links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "py-3 px-4 text-lg font-medium hover:bg-accent/5 rounded-lg transition-colors",
                  isActive(link.href)
                    ? "text-accent"
                    : "text-foreground hover:text-accent"
                )}
                onClick={(e) => handleNavClick(e, link.href, true)}
              >
                <div className="flex items-center justify-between">
                  <span>{t(link.key)}</span>
                  <span className="text-xs text-foreground/50">
                    {t(`descriptions.${link.key}`)}
                  </span>
                </div>
              </Link>
            ))}

            {/* Dropdown Menus - Collapsible */}
            {dropdownMenus.map((menu) => (
              <div key={menu.titleKey}>
                <button
                  onClick={() => toggleMobileDropdown(menu.titleKey)}
                  className={cn(
                    "w-full py-3 px-4 text-lg font-semibold hover:bg-accent/5 rounded-lg transition-colors flex items-center justify-between",
                    menu.links.some((l) => isActive(l.href))
                      ? "text-accent"
                      : "text-foreground hover:text-accent"
                  )}
                  aria-expanded={openMobileDropdowns.has(menu.titleKey)}
                  aria-haspopup="true"
                >
                  <span>{tNavSections(menu.titleKey)}</span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "transition-transform",
                      openMobileDropdowns.has(menu.titleKey) ? "rotate-180" : "",
                    )}
                  />
                </button>

                {/* Collapsible Links */}
                {openMobileDropdowns.has(menu.titleKey) && (
                  <div className="pl-4 space-y-1 animate-in fade-in slide-in-from-top-2">
                    {menu.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "block py-2 px-4 text-base font-medium hover:bg-accent/5 rounded transition-colors",
                          isActive(link.href)
                            ? "text-accent"
                            : "text-foreground hover:text-accent"
                        )}
                        onClick={(e) => handleNavClick(e, link.href, true)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t(link.key)}</span>
                          <span className="text-xs text-foreground/50">
                            {t(`descriptions.${link.key}`)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Theme & Language Toggles */}
            <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
              <div className="flex items-center justify-between px-4">
                <span className="text-sm text-foreground/70">{tMobile("theme")}</span>
                <ThemeDropdown />
              </div>
              <div className="flex items-center justify-between px-4">
                <span className="text-sm text-foreground/70">{tMobile("language")}</span>
                <LanguageDropdown />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <Button
                href="/contact#assessment-form"
                className="w-full"
                onClick={closeMobileMenu}
              >
                {t("cta")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}