"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Settings, Moon, Sun, Globe, Check } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

export default function SettingsDropdown() {
  const t = useTranslations("preferences");
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-2 rounded-lg text-foreground/70 transition-colors hover:bg-accent/5 hover:text-accent"
        aria-label={t("settings")}
      >
        <Globe size={16} />
        <Settings size={20} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-primary-darker/95 backdrop-blur-md border border-border rounded-xl shadow-2xl py-4 z-50">
            {/* Theme Section */}
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-3">
                <Sun size={14} />
                {t("theme")}
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    if (theme !== "dark") toggleTheme();
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    theme === "dark"
                      ? "bg-accent text-primary-dark font-medium"
                      : "text-foreground hover:bg-accent/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Moon size={16} />
                    {t("dark")}
                  </div>
                  {theme === "dark" && <Check size={16} />}
                </button>
                <button
                  onClick={() => {
                    if (theme !== "light") toggleTheme();
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    theme === "light"
                      ? "bg-accent text-primary-dark font-medium"
                      : "text-foreground hover:bg-accent/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Sun size={16} />
                    {t("light")}
                  </div>
                  {theme === "light" && <Check size={16} />}
                </button>
              </div>
            </div>

            {/* Language Section */}
            <div className="px-4 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-3">
                <Globe size={14} />
                {t("language")}
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
