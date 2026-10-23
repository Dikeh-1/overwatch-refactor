"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export type AdminLang = "pt" | "en";

interface AdminLanguageContextType {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  toggleLang: () => void;
  t: (en: string, pt: string) => string;
}

const AdminLanguageContext = createContext<AdminLanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (en) => en,
});

export const AdminLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AdminLang>("en");

  useEffect(() => {
    let active = true;
    const readLanguage = () => {
      if (!active) return;
      try {
        const saved = localStorage.getItem("overwatch_admin_lang");
        if (saved === "pt" || saved === "en") setLangState(saved);
      } catch { /* Storage can be unavailable in restricted browsers. */ }
    };
    // Hydrate after the initial server-compatible render and keep other tabs in sync.
    queueMicrotask(readLanguage);
    const changed = (event: StorageEvent) => { if (event.key === "overwatch_admin_lang") readLanguage(); };
    window.addEventListener("storage", changed);
    return () => { active = false; window.removeEventListener("storage", changed); };
  }, []);

  const setLang = useCallback((newLang: AdminLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem("overwatch_admin_lang", newLang);
    } catch {
      // ignore
    }
  }, []);

  const toggleLang = useCallback(() => {
    const next = lang === "pt" ? "en" : "pt";
    setLang(next);
  }, [lang, setLang]);

  const t = useCallback((en: string, pt: string) => (lang === "en" ? en : pt), [lang]);
  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return (
    <AdminLanguageContext.Provider value={value}>
      {children}
    </AdminLanguageContext.Provider>
  );
};

export const useAdminLanguage = () => useContext(AdminLanguageContext);
