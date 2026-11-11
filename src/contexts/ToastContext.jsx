import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback(id => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = "info") => {
      counter.current += 1;
      const id = counter.current;
      setToasts(current => [...current, { id, message, tone }]);
      if (typeof window !== "undefined") {
        window.setTimeout(() => dismiss(id), 5200);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: message => push(message, "success"),
      error: message => push(message, "error"),
      info: message => push(message, "info")
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
