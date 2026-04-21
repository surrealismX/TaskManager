import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("access_token") || "");
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(!!token);

  const isAuthed = !!token;

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!token) {
        setMe(null);
        setLoadingMe(false);
        return;
      }
      setLoadingMe(true);
      try {
        const res = await api.get("/users/me");
        if (alive) setMe(res.data);
      } catch {
        if (alive) {
          localStorage.removeItem("access_token");
          setTokenState("");
          setMe(null);
        }
      } finally {
        if (alive) setLoadingMe(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      isAuthed,
      me,
      loadingMe,
      setToken: (t) => {
        const val = t || "";
        setTokenState(val);
        if (val) localStorage.setItem("access_token", val);
        else localStorage.removeItem("access_token");
      },
      logout: () => {
        localStorage.removeItem("access_token");
        setTokenState("");
        setMe(null);
      },
    }),
    [token, isAuthed, me, loadingMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
