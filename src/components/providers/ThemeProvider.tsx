"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

type Theme = "dark" | "light";
const DEFAULT_THEME: Theme = "dark";
const THEME_STORAGE_KEY = "theme";
const THEME_VERSION_KEY = "theme_version";
const THEME_VERSION = "3";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribeToHydration() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const themeVersion = localStorage.getItem(THEME_VERSION_KEY);

  if (themeVersion === THEME_VERSION && isTheme(savedTheme)) {
    return savedTheme;
  }

  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const themeVersion = localStorage.getItem(THEME_VERSION_KEY);

    if (themeVersion !== THEME_VERSION) {
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
      localStorage.setItem(THEME_VERSION_KEY, THEME_VERSION);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const contextValue = { theme, toggleTheme };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
