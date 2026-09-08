import { useState, useEffect } from "react";

let globalDeferredPrompt: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent("ubt-beforeinstallprompt"));
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isAppleMobile);
    };

    checkIOS();

    const handlePromptEvent = () => {
      setDeferredPrompt(globalDeferredPrompt);
    };

    window.addEventListener("ubt-beforeinstallprompt", handlePromptEvent);

    return () => {
      window.removeEventListener("ubt-beforeinstallprompt", handlePromptEvent);
    };
  }, []);

  const install = async (): Promise<"accepted" | "dismissed" | "ios_instructions" | "prompt_unavailable"> => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
        }
        return outcome;
      } catch (err) {
        console.error("Erro ao disparar prompt nativo de instalação:", err);
      }
    }
    
    if (isIOS) {
      return "ios_instructions";
    }

    return "prompt_unavailable";
  };

  return {
    showInstallBtn: !isStandalone,
    isStandalone,
    isIOS,
    hasNativePrompt: !!deferredPrompt,
    install
  };
}
