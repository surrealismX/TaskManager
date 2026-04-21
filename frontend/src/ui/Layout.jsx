// frontend/src/ui/Layout.jsx

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { online, syncNow } from "../sync/sync";
import { useToast } from "./Toast";
import { toggleTheme } from "../utils/theme";

// Icons
import {
  HomeIcon,
  FolderIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function Layout() {
  const { isAuthed, loadingMe, me, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const [isOnline, setIsOnline] = useState(online());
  const [syncing, setSyncing] = useState(false);

  // Online/offline listeners
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function doSync() {
    if (!isOnline) {
      toast.push({
        title: "Offline",
        desc: "Synchronizacja wymaga internetu.",
      });
      return;
    }

    setSyncing(true);
    try {
      await syncNow();
      toast.push({ title: "Gotowe", desc: "Dane zsynchronizowane." });
    } catch (e) {
      toast.push({
        title: "Błąd synchronizacji",
        desc: e?.response?.data?.detail || e?.message,
      });
    } finally {
      setSyncing(false);
    }
  }

  function onLogout() {
    logout();
    nav("/login");
  }

  if (loadingMe) {
    return (
      <div className="card card-pad">
        <b>Sprawdzanie sesji…</b>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">

      {/* ---------------------------------------------------------
         FLOATING SIDEBAR (Dashboard at top)
      --------------------------------------------------------- */}
      {isAuthed && (
        <aside
          className="
            fixed left-4 top-1/2 -translate-y-1/2
            flex flex-col items-center gap-4
            p-4 rounded-2xl
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.08)]
            border border-[rgba(255,255,255,0.15)]
            shadow-xl
            hover:w-48 w-16
            transition-all duration-300
            group
            z-40
          "
        >
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `
              flex items-center gap-3 w-full px-3 py-2 rounded-xl
              transition
              ${isActive ? "bg-[rgba(255,255,255,0.15)]" : "hover:bg-[rgba(255,255,255,0.1)]"}
            `
            }
          >
            <HomeIcon className="w-6 h-6" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Dashboard
            </span>
          </NavLink>

          {/* Projects */}
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `
              flex items-center gap-3 w-full px-3 py-2 rounded-xl
              transition
              ${isActive ? "bg-[rgba(255,255,255,0.15)]" : "hover:bg-[rgba(255,255,255,0.1)]"}
            `
            }
          >
            <FolderIcon className="w-6 h-6" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Projekty
            </span>
          </NavLink>

          {/* Finance */}
          <NavLink
            to="/finance"
            className={({ isActive }) =>
              `
              flex items-center gap-3 w-full px-3 py-2 rounded-xl
              transition
              ${isActive ? "bg-[rgba(255,255,255,0.15)]" : "hover:bg-[rgba(255,255,255,0.1)]"}
            `
            }
          >
            <BanknotesIcon className="w-6 h-6" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Finanse
            </span>
          </NavLink>

          {/* Sync */}
          <button
            onClick={doSync}
            disabled={syncing}
            className="
              flex items-center gap-3 w-full px-3 py-2 rounded-xl
              hover:bg-[rgba(255,255,255,0.1)]
              transition disabled:opacity-50
            "
          >
            <ArrowPathIcon className="w-6 h-6" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {syncing ? "Sync…" : "Sync"}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="
              flex items-center gap-3 w-full px-3 py-2 rounded-xl
              hover:bg-[rgba(255,255,255,0.1)]
              transition
            "
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Wyloguj
            </span>
          </button>
        </aside>
      )}

      {/* ---------------------------------------------------------
         MAIN CONTENT
      --------------------------------------------------------- */}
      <div className="flex-1 ml-20">

        {/* ---------------------------------------------------------
           SINGLE TOPBAR (NO DUPLICATION)
        --------------------------------------------------------- */}
        <header
          className="
            sticky top-0 z-30
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.06)]
            border-b border-[var(--border)]
            shadow-lg
          "
        >
          <div className="flex items-center gap-4 px-6 py-4">

            <span className="text-lg font-semibold tracking-wide">
              Task Manager
            </span>

            <span className={`pill ${isOnline ? "ok" : "bad"}`}>
              {isOnline ? "online" : "offline"}
            </span>

            <div className="spacer" />

            {/* User email */}
            <span className="pill">{me?.email}</span>

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="btn">🌓</button>

            {/* Logout */}
            <button onClick={onLogout} className="btn">Wyloguj</button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
