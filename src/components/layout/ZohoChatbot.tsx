"use client";

import { useEffect } from "react";
import { isConstrainedDevice } from "@/lib/device-performance";

type SalesIQ = {
  ready?: () => void;
  widgetcode?: string;
  floatwindow?: {
    visible?: (state: "show" | "hide" | string) => void;
  };
  floatbutton?: {
    coin?: {
      hidetooltip?: () => void;
    };
  };
};

type ZohoWindow = Window & {
  $zoho?: {
    salesiq?: SalesIQ;
  };
};

const ZOHO_WIDGET_SRC =
  "https://salesiq.zohopublic.com/widget?wc=siq80b8b734cb6cc48334e01ab8c29da76f4ecfcbad2ed2ade5b18c142f9ec357da";

export function openOverwatchChatbot() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("overwatch:open-chat"));
}

export default function ZohoChatbot() {
  useEffect(() => {
    let interactionTimer: number | undefined;
    let pendingOpen = false;
    const isConstrained = isConstrainedDevice();

    const loadZohoChat = (openImmediately = false) => {
      if (openImmediately) pendingOpen = true;
      const zohoWindow = window as ZohoWindow;

      if (document.getElementById("zsiqscript")) {
        if (pendingOpen && zohoWindow.$zoho?.salesiq?.floatwindow?.visible) {
          zohoWindow.$zoho.salesiq.floatwindow.visible("show");
          pendingOpen = false;
        }
        return;
      }

      zohoWindow.$zoho = zohoWindow.$zoho || {};
      zohoWindow.$zoho.salesiq = zohoWindow.$zoho.salesiq || {};

      const salesiq = zohoWindow.$zoho.salesiq;
      salesiq.ready = () => {
        if (pendingOpen) {
          salesiq.floatwindow?.visible?.("show");
          pendingOpen = false;
        } else {
          // Keep the support button available without covering page content with
          // an unsolicited welcome window or tooltip.
          salesiq.floatwindow?.visible?.("hide");
          salesiq.floatbutton?.coin?.hidetooltip?.();
        }
      };

      const widgetScript = document.createElement("script");
      widgetScript.id = "zsiqscript";
      widgetScript.src = ZOHO_WIDGET_SRC;
      widgetScript.async = true;
      widgetScript.defer = true;
      document.body.appendChild(widgetScript);
    };

    const requestLoad = () => {
      if (interactionTimer || document.getElementById("zsiqscript")) return;
      interactionTimer = window.setTimeout(() => loadZohoChat(false), 1200);
    };

    const handleOpenChat = () => {
      if (interactionTimer) {
        window.clearTimeout(interactionTimer);
        interactionTimer = undefined;
      }
      loadZohoChat(true);
    };

    // Defer the third-party chat payload until there is user intent, with a
    // fallback so support remains available to visitors who pause on a page.
    window.addEventListener("pointerdown", requestLoad, { once: true, passive: true });
    window.addEventListener("touchstart", requestLoad, { once: true, passive: true });
    window.addEventListener("keydown", requestLoad, { once: true });
    window.addEventListener("overwatch:open-chat", handleOpenChat);

    // On candidate test-invite pages, ensure the floating chatbot icon appears promptly
    const isTestInvitePage =
      typeof window !== "undefined" && window.location.pathname.includes("/careers/test-invite");
    const fallbackTimer = isTestInvitePage
      ? window.setTimeout(() => loadZohoChat(false), 400)
      : isConstrained
        ? undefined
        : window.setTimeout(requestLoad, 15000);

    return () => {
      window.removeEventListener("pointerdown", requestLoad);
      window.removeEventListener("touchstart", requestLoad);
      window.removeEventListener("keydown", requestLoad);
      window.removeEventListener("overwatch:open-chat", handleOpenChat);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (interactionTimer) window.clearTimeout(interactionTimer);
    };
  }, []);

  return null;
}
