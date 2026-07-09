"use client";

import { useEffect } from "react";

const COOKIE_NAME = "overwatch_cookie_notice";
const COOKIE_VALUE = "accepted";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const ACCEPT_LABELS = new Set([
  "accept",
  "accept all",
  "accept cookies",
  "agree",
  "allow all",
  "got it",
  "i accept",
  "ok",
  "aceitar",
  "aceitar tudo",
  "aceitar cookies",
  "concordo",
]);

function markCookieNoticeHandled() {
  window.localStorage.setItem(COOKIE_NAME, COOKIE_VALUE);
  window.localStorage.setItem("cookieconsent_status", "allow");
  window.localStorage.setItem("cookies_accepted", "true");
  window.localStorage.setItem("zoho_cookie_notice", COOKIE_VALUE);
  document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  document.cookie = `cookieconsent_status=allow; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

function textFromElement(element: HTMLElement) {
  const value =
    element.getAttribute("aria-label") ||
    element.getAttribute("value") ||
    element.textContent ||
    "";

  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasCookieBannerContext(element: HTMLElement) {
  let current: HTMLElement | null = element;

  for (let depth = 0; current && depth < 6; depth += 1) {
    const identity = `${current.id} ${String(current.className)}`.toLowerCase();
    const text = (current.textContent || "").replace(/\s+/g, " ").toLowerCase();

    if (
      identity.includes("cookie") ||
      identity.includes("consent") ||
      identity.includes("zsiq") ||
      text.includes("cookies") ||
      text.includes("we use cookies") ||
      text.includes("best possible experience") ||
      text.includes("learn more") ||
      text.includes("preferências") ||
      text.includes("privacidade")
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function getAvailableDocuments() {
  const documents: Document[] = [document];

  document.querySelectorAll("iframe").forEach((iframe) => {
    try {
      if (iframe.contentDocument) {
        documents.push(iframe.contentDocument);
      }
    } catch {
      // Cross-origin widget frames cannot be inspected from this page.
    }
  });

  return documents;
}

function acceptVisibleCookiePromptIn(root: Document) {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(
      "button, [role='button'], a, input[type='button'], input[type='submit']",
    ),
  );

  const acceptButton = candidates.find((candidate) => {
    const label = textFromElement(candidate);

    return ACCEPT_LABELS.has(label) && hasCookieBannerContext(candidate);
  });

  if (!acceptButton) return false;

  acceptButton.click();
  markCookieNoticeHandled();
  return true;
}

function acceptVisibleCookiePrompt() {
  return getAvailableDocuments().some(acceptVisibleCookiePromptIn);
}

export default function AutoAcceptWidgetCookies() {
  useEffect(() => {
    markCookieNoticeHandled();

    if (acceptVisibleCookiePrompt()) return;

    const retryDelays = [50, 150, 300, 600, 1000, 1500, 2500, 4000, 6500, 9000];
    const retryTimers = retryDelays.map((delay) =>
      window.setTimeout(acceptVisibleCookiePrompt, delay),
    );
    const retryInterval = window.setInterval(acceptVisibleCookiePrompt, 1000);

    const observer = new MutationObserver(() => {
      acceptVisibleCookiePrompt();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const stopWatching = window.setTimeout(() => {
      window.clearInterval(retryInterval);
      observer.disconnect();
    }, 15000);

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(retryInterval);
      window.clearTimeout(stopWatching);
      observer.disconnect();
    };
  }, []);

  return null;
}
