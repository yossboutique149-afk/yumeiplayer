/**
 * Small PWA helpers: installability, service worker registration and update
 * detection. Kept free of React so the behaviour is easy to reason about.
 */

export function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)")?.matches;
  return Boolean(displayMode || window.navigator.standalone === true);
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

/**
 * Registers the generated service worker and reports when a new version is
 * waiting, so the UI can offer a refresh instead of silently serving old files.
 */
export async function registerServiceWorker({ onUpdate } = {}) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    const announce = () => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdate?.(registration);
      }
    };

    announce();

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          onUpdate?.(registration);
        }
      });
    });

    return registration;
  } catch {
    // Offline support is an enhancement; never break the app because of it.
    return null;
  }
}

export function applyServiceWorkerUpdate(registration) {
  registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  const mb = value / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
