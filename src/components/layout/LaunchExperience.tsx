"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import Logo from "@/components/ui/Logo";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "overwatch_install_prompt_dismissed";

function isStandaloneApp() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export default function LaunchExperience() {
  const [showLaunch, setShowLaunch] = useState(true);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();
    const minVisibleMs = 450;
    const maxVisibleMs = 1200;

    const hideLaunch = () => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, minVisibleMs - elapsed);
      window.setTimeout(() => setShowLaunch(false), remaining);
    };

    if (document.readyState === "complete") {
      hideLaunch();
    } else {
      window.addEventListener("load", hideLaunch, { once: true });
    }

    const maxTimer = window.setTimeout(() => setShowLaunch(false), maxVisibleMs);

    return () => {
      window.removeEventListener("load", hideLaunch);
      window.clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      window.location.protocol !== "https:" ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isStandaloneApp()) return;

    let showTimer: number | undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const dismissed = window.sessionStorage.getItem(INSTALL_DISMISSED_KEY);
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);

      if (!dismissed) {
        showTimer = window.setTimeout(() => setShowInstallPrompt(true), 1800);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (showTimer) {
        window.clearTimeout(showTimer);
      }
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setShowInstallPrompt(false);
    setInstallPrompt(null);
  };

  const dismissInstallPrompt = () => {
    window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setShowInstallPrompt(false);
  };

  return (
    <>
      {showLaunch && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f1117] text-white">
          <div className="flex w-full max-w-xs flex-col items-center px-8 text-center">
            <Logo size="lg" preload className="mb-8 scale-90" />
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="launch-progress h-full rounded-full bg-white/70" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
              Loading...
            </p>
          </div>
        </div>
      )}

      {showInstallPrompt && installPrompt && (
        <div className="fixed inset-x-4 bottom-5 z-[9998] mx-auto max-w-md rounded-2xl border border-white/12 bg-primary-dark/95 p-4 text-white shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={dismissInstallPrompt}
            className="absolute right-3 top-3 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close install prompt"
          >
            <X size={16} />
          </button>
          <div className="flex items-start gap-3 pr-7">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-dark">
              <Download size={20} />
            </div>
            <div>
              <p className="font-semibold">Install Overwatch</p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Add this website to your phone for faster access and an app-like
                experience.
              </p>
              <button
                type="button"
                onClick={installApp}
                className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-dark transition hover:bg-white/90"
              >
                Install App
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
