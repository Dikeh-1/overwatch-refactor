"use client";

import { useEffect } from "react";

type ZohoWindow = Window & {
  $zoho?: {
    salesiq?: {
      widgetcode?: string;
    };
  };
};

export default function ZohoChatbot() {
  useEffect(() => {
    // Zoho SalesIQ Chat Widget Integration
    const loadZohoChat = () => {
      if (typeof window !== "undefined") {
        console.log("Loading Zoho SalesIQ widget...");
        
        // First script: Initialize $zoho object
        const inlineScript = document.createElement("script");
        inlineScript.textContent = `
          window.$zoho = window.$zoho || {};
          $zoho.salesiq = $zoho.salesiq || { ready: function() {} };
          console.log("Zoho $zoho object initialized");
        `;
        document.head.appendChild(inlineScript);

        // Second script: Load the widget
        const widgetScript = document.createElement("script");
        widgetScript.id = "zsiqscript";
        widgetScript.src = "https://salesiq.zohopublic.com/widget?wc=siq80b8b734cb6cc4833";
        widgetScript.async = true;
        widgetScript.defer = true;
        
        widgetScript.onload = () => {
          console.log("Zoho SalesIQ widget script loaded successfully");
          console.log(
            "Widget code:",
            (window as ZohoWindow).$zoho?.salesiq?.widgetcode,
          );
        };
        
        widgetScript.onerror = (error) => {
          console.error("Failed to load Zoho SalesIQ widget:", error);
        };
        
        document.body.appendChild(widgetScript);
      }
    };

    loadZohoChat();

    return () => {
      // Cleanup
      const widgetScript = document.getElementById("zsiqscript");
      if (widgetScript) widgetScript.remove();
    };
  }, []);

  return null; // This component doesn't render anything visible
}
