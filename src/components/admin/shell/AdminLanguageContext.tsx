"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
    try {
      const saved = localStorage.getItem("overwatch_admin_lang") as AdminLang | null;
      if (saved === "pt" || saved === "en") {
        setLangState(saved);
      }
    } catch {
      // localStorage may fail in SSR or restricted environments
    }
  }, []);

  const setLang = (newLang: AdminLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem("overwatch_admin_lang", newLang);
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    const next = lang === "pt" ? "en" : "pt";
    setLang(next);
  };

  const t = (en: string, pt: string) => (lang === "en" ? en : pt);

  return (
    <AdminLanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </AdminLanguageContext.Provider>
  );
};

export const useAdminLanguage = () => useContext(AdminLanguageContext);
