"use client";

import { useEffect } from "react";

const COOKIE_NAME = "overwatch_cookie_notice";
const COOKIE_VALUE = "accepted";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function markCookieNoticeHandled() {
  window.localStorage.setItem(COOKIE_NAME, COOKIE_VALUE);
  document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
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
      text.includes("we use cookies") ||
      text.includes("best possible experience") ||
      (text.includes("cookies") && text.includes("learn more"))
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function acceptVisibleCookiePrompt() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button, [role='button'], a, input[type='button'], input[type='submit']",
    ),
  );

  const acceptButton = candidates.find((candidate) => {
    const label = textFromElement(candidate);

    return (
      (label === "accept all" ||
        label === "accept cookies" ||
        label === "i accept" ||
        label === "agree") &&
      hasCookieBannerContext(candidate)
    );
  });

  if (!acceptButton) return false;

  acceptButton.click();
  markCookieNoticeHandled();
  return true;
}

export default function AutoAcceptWidgetCookies() {
  useEffect(() => {
    markCookieNoticeHandled();

    if (acceptVisibleCookiePrompt()) return;

    const retryDelays = [1000, 3000, 7000];
    const retryTimers = retryDelays.map((delay) =>
      window.setTimeout(acceptVisibleCookiePrompt, delay),
    );

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
