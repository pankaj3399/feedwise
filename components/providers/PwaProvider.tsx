"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaContextValue = {
  canInstall: boolean;
  isStandalone: boolean;
  online: boolean;
  install: () => Promise<boolean>;
  clearCaches: () => Promise<void>;
};

const PwaContext = createContext<PwaContextValue | null>(null);

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error("usePwa must be used inside PwaProvider");
  return ctx;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setOnline(navigator.onLine);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      toast({ title: "Feedwise installed", description: "Open it from your home screen.", tone: "success" });
    };
    const onOnline = () => {
      setOnline(true);
      toast({ title: "Back online", description: "Your progress will sync.", tone: "success" });
    };
    const onOffline = () => {
      setOnline(false);
      toast({ title: "You're offline", description: "Cached ideas are still readable." });
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* service worker is a progressive enhancement */
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [toast]);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      return true;
    }
    return false;
  }, [promptEvent]);

  const clearCaches = useCallback(async () => {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  }, []);

  const value = useMemo(
    () => ({ canInstall: Boolean(promptEvent), isStandalone, online, install, clearCaches }),
    [promptEvent, isStandalone, online, install, clearCaches],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
