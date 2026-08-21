"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

export default function LanguageDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-1 rounded-lg text-foreground/70 transition-colors hover:bg-accent/5 hover:text-accent"
        aria-label="Language"
      >
        <Globe size={18} />
        <ChevronDown size={14} className="transition-transform" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-primary-darker/95 backdrop-blur-md border border-border rounded-xl shadow-2xl py-3 z-50">
            <div className="px-4">
              <LanguageSwitcher />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
