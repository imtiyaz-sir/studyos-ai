import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "studyos.install.dismissedAt";
const DISMISS_DAYS = 14;

/** Registers the service worker (production builds only, so Vite HMR is never cached). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const announce = () => window.dispatchEvent(new CustomEvent("studyos:sw-update", { detail: reg }));
      if (reg.waiting && navigator.serviceWorker.controller) announce();
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) announce();
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!reloading) { reloading = true; window.location.reload(); }
      });
    } catch (err) {
      console.warn("Service worker registration failed:", err);
    }
  });
}

export function applyServiceWorkerUpdate(reg) {
  reg?.waiting?.postMessage("SKIP_WAITING");
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at && Date.now() - at < DISMISS_DAYS * 864e5;
  } catch { return false; }
}

/**
 * Install state with feature detection:
 *  - `canPrompt`: browser fired beforeinstallprompt (Chromium/Android) → we can show a real prompt.
 *  - otherwise `platform` tells the UI which manual instructions to show.
 */
export function useInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && recentlyDismissed());

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return "unavailable";
    deferred.prompt();
    const { outcome } = await deferred.userChoice; // "accepted" | "dismissed"
    setDeferred(null); // a prompt event can only be used once
    if (outcome === "dismissed") {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
      setDismissed(true);
    }
    return outcome;
  }, [deferred]);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform = /iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "desktop";

  return { installed, canPrompt: !!deferred, dismissed, install, platform };
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}
