import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Sentry telemetry neutralized until production DSNs are definitively provisioned
// to avoid client-side 403 Forbidden errors in the console.
/*
try {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn && typeof sentryDsn === "string" && sentryDsn.startsWith("http")) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 0.5,
      environment: import.meta.env.MODE || "production",
      beforeSend(event) {
        try {
          return event;
        } catch {
          return null;
        }
      },
    });
  }
} catch (sentryInitError) {
  console.warn("[Sentry] Telemetry initialization bypassed:", sentryInitError);
}
*/

// Dynamically configure Manifest & Title for Environment
try {
  const isProd = 
    window.location.hostname === "ubt.app.br" ||
    (import.meta.env.VITE_APP_ENV === "production" && 
     !window.location.hostname.includes("homolog") && 
     !window.location.hostname.includes("localhost"));
  
  if (!isProd && typeof document !== "undefined") {
    // Dynamic manifest for preview / homolog / dev
    const homologManifest = {
      short_name: "UBT Homolog",
      name: "UBT Homolog — O Superapp do Trabalhador",
      icons: [
        {
          src: "/favicon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      start_url: "/",
      background_color: "#0B1B3E",
      theme_color: "#0B1B3E",
      display: "standalone",
      orientation: "portrait"
    };

    const manifestBlob = new Blob([JSON.stringify(homologManifest)], { type: "application/json" });
    const manifestURL = URL.createObjectURL(manifestBlob);
    const linkEl = document.querySelector('link[rel="manifest"]');
    if (linkEl) {
      linkEl.setAttribute("href", manifestURL);
    }
  }
} catch (e) {
  console.debug("[PWA] Dynamic manifest initialization bypassed:", e);
}

createRoot(document.getElementById("root")!).render(<App />);
