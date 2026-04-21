import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("user1@test.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const auth = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      auth.setToken(data.access_token);
      toast.push({ title: "Zalogowano", desc: "Witamy!" });
      nav("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Nie udało się zalogować");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        min-h-screen flex items-center justify-center
        bg-[var(--bg)] text-[var(--text)]
        px-4
      "
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">

        {/* ---------------------------------------------------------
           GLASS LOGIN CARD
        --------------------------------------------------------- */}
        <div
          className="
            p-8 rounded-2xl
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.08)]
            border border-[rgba(255,255,255,0.15)]
            shadow-2xl
          "
        >
          <h2 className="text-2xl font-bold mb-6 tracking-wide">
            Logowanie
          </h2>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1">
              <label className="label">Email</label>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@test.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Hasło</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="minimum 6 znaków"
              />
            </div>

            <button
              className="btn primary w-full mt-2"
              disabled={loading}
              type="submit"
            >
              {loading ? "Logowanie…" : "Zaloguj się"}
            </button>

            {error && (
              <div className="text-[var(--danger)] text-sm">{error}</div>
            )}

            <div className="text-sm text-[var(--muted)]">
              Nie masz konta?{" "}
              <Link
                to="/register"
                className="text-[var(--accent)] hover:underline"
              >
                Zarejestruj się
              </Link>
            </div>
          </form>
        </div>

        {/* ---------------------------------------------------------
           GLASS OFFLINE INFO CARD
        --------------------------------------------------------- */}
        <div
          className="
            p-8 rounded-2xl
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.06)]
            border border-[rgba(255,255,255,0.12)]
            shadow-xl
          "
        >
          <h3 className="text-xl font-semibold mb-3">Tryb offline</h3>

          <p className="text-[var(--muted)] leading-relaxed text-sm">
            Po zalogowaniu możesz tworzyć i edytować projekty oraz zadania
            nawet bez internetu.  
            Zmiany trafią do lokalnej kolejki i zsynchronizują się po
            przywróceniu połączenia przyciskiem <b>Sync</b>.
          </p>
        </div>
      </div>
    </div>
  );
}
