// frontend/src/ui/Topbar.jsx

import { useAuth } from "../auth/AuthContext";
import { toggleTheme } from "../utils/theme";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header
      className="
        topbar
        sticky top-0 z-30
        backdrop-blur-xl
        bg-[rgba(255,255,255,0.06)]
        border-b border-[var(--border)]
        shadow-lg
      "
    >
      <div className="topbar-inner flex items-center justify-between px-6 py-4">

        {/* BRAND */}
        <h1 className="text-xl font-semibold tracking-wide">Task Manager</h1>

        <div className="flex items-center gap-4">

          {/* THEME TOGGLE (animated) */}
          <button onClick={toggleTheme} className="theme-toggle">
            <div className="theme-toggle-knob">🌓</div>
          </button>

          {/* USER EMAIL */}
          <span className="text-sm opacity-80">{user?.email}</span>

          {/* LOGOUT */}
          <button
            onClick={logout}
            className="
              px-3 py-1 rounded-lg
              bg-[rgba(255,255,255,0.08)]
              border border-[var(--border)]
              hover:bg-[rgba(255,255,255,0.12)]
              transition
            "
          >
            Wyloguj się
          </button>
        </div>
      </div>
    </header>
  );
}
