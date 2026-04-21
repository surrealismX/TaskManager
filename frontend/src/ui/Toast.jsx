import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(
    () => ({
      push: ({ title, desc, kind = "info", ttl = 3500 }) => {
        const id = crypto.randomUUID();
        setToasts((t) => [...t, { id, title, desc, kind }]);
        window.setTimeout(() => {
          setToasts((t) => t.filter((x) => x.id !== id));
        }, ttl);
      },
      clear: () => setToasts([]),
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toastWrap">
        {toasts.map((t) => (
          <div key={t.id} className="card toast card-pad">
            <div className="row">
              <div className="col" style={{ gap: 4 }}>
                <div className="title">{t.title}</div>
                {t.desc ? <div className="desc">{t.desc}</div> : null}
              </div>
              <div className="spacer" />
              <button className="btn" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
