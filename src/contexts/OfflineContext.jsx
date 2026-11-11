import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  applyServiceWorkerUpdate,
  isIosDevice,
  isStandalone,
  registerServiceWorker
} from "../lib/pwa.js";

const OfflineContext = createContext(null);

const DISMISS_KEY = "yumeika.install.dismissed";
const SAVED_KEY = "yumeika.offline.savedAt";

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be blocked in private mode; the app still works */
  }
}

/**
 * Offline-first state for the installed app: connection status, service worker
 * readiness, "save everything" progress and the install prompt.
 */
export function OfflineProvider({ children }) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [controlled, setControlled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => read(DISMISS_KEY) === "1");
  const [savedAt, setSavedAt] = useState(() => read(SAVED_KEY));
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const registrationRef = useRef(null);
  const ios = isIosDevice();

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const onPrompt = event => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const refreshStorage = useCallback(async () => {
    if (!navigator.storage?.estimate) return;
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      setStorage({ usage, quota });
    } catch {
      /* estimate is best-effort */
    }
  }, []);

  /**
   * Reads the real Cache Storage contents. The UI must report what is actually
   * stored on this device instead of assuming the worker already controls the
   * page, which on a first visit it may not yet.
   */
  const verifyCache = useCallback(async () => {
    if (typeof caches === "undefined") return 0;
    try {
      const response = await fetch("/offline-manifest.json", { cache: "no-store" });
      const manifest = response.ok ? await response.json() : null;
      const files = manifest?.files || [];
      setFileCount(files.length);

      let found = 0;
      for (const file of files) {
        try {
          if (await caches.match(file)) found += 1;
        } catch {
          /* an unreadable entry simply does not count */
        }
      }
      setCachedCount(found);
      return found;
    } catch {
      return 0;
    }
  }, []);

  // The service worker only exists in the built app.
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return undefined;
    let active = true;

    const sync = () => {
      if (!active) return;
      setControlled(Boolean(navigator.serviceWorker.controller));
      verifyCache();
    };

    navigator.serviceWorker.addEventListener("controllerchange", sync);

    registerServiceWorker({
      onUpdate: registration => {
        registrationRef.current = registration;
        setUpdateReady(true);
      }
    }).then(registration => {
      if (!active || !registration) return;
      registrationRef.current = registration;
      sync();
      navigator.serviceWorker.ready
        .then(() => {
          if (!active) return;
          setControlled(true);
          verifyCache();
        })
        .catch(() => {});
    });

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", sync);
    };
  }, [verifyCache]);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage, controlled, savedAt, cachedCount]);

  const install = useCallback(async () => {
    if (!installEvent) return false;
    try {
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice?.outcome === "accepted") {
        setInstalled(true);
        setInstallEvent(null);
        return true;
      }
    } catch {
      /* the prompt can be dismissed by the browser */
    }
    return false;
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    setDismissed(true);
    write(DISMISS_KEY, "1");
  }, []);

  /**
   * Forces every file of the built app into the cache so the first offline
   * launch is instant, with visible progress instead of a silent wait.
   */
  const saveAll = useCallback(async () => {
    setDownloading(true);
    setProgress(0);
    try {
      const response = await fetch("/offline-manifest.json", { cache: "no-store" });
      const manifest = await response.json();
      const files = manifest.files || [];
      setFileCount(files.length);

      // Store the files here as well: the button must work even before the
      // worker controls the page, and the worker reuses this same cache name.
      const cache =
        typeof caches === "undefined"
          ? null
          : await caches.open(`yumeika-shell-${manifest.version || "manual"}`);

      let done = 0;
      for (const file of files) {
        try {
          const fileResponse = await fetch(file, { cache: "reload" });
          if (cache && fileResponse.ok) {
            await cache.put(file, fileResponse.clone());
          }
        } catch {
          /* a single missing file must not abort the whole download */
        }
        done += 1;
        setProgress(Math.round((done / Math.max(files.length, 1)) * 100));
      }

      const stamp = new Date().toISOString();
      write(SAVED_KEY, stamp);
      setSavedAt(stamp);
      await verifyCache();
      await refreshStorage();
      return true;
    } catch {
      return false;
    } finally {
      setDownloading(false);
    }
  }, [refreshStorage, verifyCache]);

  const applyUpdateNow = useCallback(() => {
    applyServiceWorkerUpdate(registrationRef.current);
    window.setTimeout(() => window.location.reload(), 350);
  }, []);

  const value = useMemo(
    () => ({
      online,
      installed,
      canInstall: Boolean(installEvent),
      ios,
      showInstallCard: !installed && !dismissed && (Boolean(installEvent) || ios),
      install,
      dismissInstall,
      controlled,
      updateReady,
      applyUpdateNow,
      downloading,
      progress,
      fileCount,
      cachedCount,
      savedAt,
      saveAll,
      storage
    }),
    [
      online,
      installed,
      installEvent,
      ios,
      dismissed,
      install,
      dismissInstall,
      controlled,
      updateReady,
      applyUpdateNow,
      downloading,
      progress,
      fileCount,
      cachedCount,
      savedAt,
      saveAll,
      storage
    ]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) throw new Error("useOffline must be used inside OfflineProvider");
  return context;
}
