"use client";

import { useEffect } from "react";

type ZohoWindow = Window & {
  $zoho?: {
    salesiq?: {
      ready?: () => void;
      widgetcode?: string;
    };
  };
};

const ZOHO_WIDGET_SRC =
  "https://salesiq.zohopublic.com/widget?wc=siq80b8b734cb6cc48334e01ab8c29da76f4ecfcbad2ed2ade5b18c142f9ec357da";

export default function ZohoChatbot() {
  useEffect(() => {
    const loadZohoChat = () => {
      if (document.getElementById("zsiqscript")) return;

      const zohoWindow = window as ZohoWindow;
      zohoWindow.$zoho = zohoWindow.$zoho || {};
      zohoWindow.$zoho.salesiq = zohoWindow.$zoho.salesiq || {
        ready: () => {},
      };

      const widgetScript = document.createElement("script");
      widgetScript.id = "zsiqscript";
      widgetScript.src = ZOHO_WIDGET_SRC;
      widgetScript.async = true;
      widgetScript.defer = true;
      document.body.appendChild(widgetScript);
    };

    const scheduleLoad = () => {
      const loadWhenIdle =
        window.requestIdleCallback ||
        ((callback: IdleRequestCallback) =>
          window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1));

      loadWhenIdle(loadZohoChat, { timeout: 3000 });
    };

    if (document.readyState === "complete") {
      scheduleLoad();
    } else {
      window.addEventListener("load", scheduleLoad, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleLoad);
    };
  }, []);

  return null;
}
