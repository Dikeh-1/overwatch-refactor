"use client";

import { useEffect } from "react";

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

export default function ZohoChatbot() {
  useEffect(() => {
    let interactionTimer: number | undefined;

    const loadZohoChat = () => {
      if (document.getElementById("zsiqscript")) return;

      const zohoWindow = window as ZohoWindow;
      zohoWindow.$zoho = zohoWindow.$zoho || {};
      zohoWindow.$zoho.salesiq = zohoWindow.$zoho.salesiq || {};

      const salesiq = zohoWindow.$zoho.salesiq;
      salesiq.ready = () => {
        // Keep the support button available without covering page content with
        // an unsolicited welcome window or tooltip.
        salesiq.floatwindow?.visible?.("hide");
        salesiq.floatbutton?.coin?.hidetooltip?.();
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
      interactionTimer = window.setTimeout(loadZohoChat, 1200);
    };

    // Defer the third-party chat payload until there is user intent, with a
    // fallback so support remains available to visitors who pause on a page.
    window.addEventListener("pointerdown", requestLoad, { once: true, passive: true });
    window.addEventListener("touchstart", requestLoad, { once: true, passive: true });
    window.addEventListener("scroll", requestLoad, { once: true, passive: true });
    window.addEventListener("keydown", requestLoad, { once: true });
    const fallbackTimer = window.setTimeout(requestLoad, 10000);

    return () => {
      window.removeEventListener("pointerdown", requestLoad);
      window.removeEventListener("touchstart", requestLoad);
      window.removeEventListener("scroll", requestLoad);
      window.removeEventListener("keydown", requestLoad);
      window.clearTimeout(fallbackTimer);
      if (interactionTimer) window.clearTimeout(interactionTimer);
    };
  }, []);

  return null;
}
