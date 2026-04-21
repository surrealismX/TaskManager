import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useToast } from "../ui/Toast";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toast = useToast();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Hasła muszą być takie same");
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      toast.push({
        title: "Konto utworzone",
        desc: "Teraz zaloguj się do systemu.",
      });
      nav("/login");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Nie udało się zarejestrować");
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
           GLASS REGISTER CARD
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
            Rejestracja
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
              <div className="label text-xs opacity-70">
                (backend wymaga 6+ znaków; bcrypt ma limit 72 bajty)
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Powtórz hasło</label>
              <input
                className="input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="powtórz hasło"
              />
            </div>

            <button
              className="btn primary w-full mt-2"
              disabled={loading}
              type="submit"
            >
              {loading ? "Tworzenie…" : "Utwórz konto"}
            </button>

            {error && (
              <div className="text-[var(--danger)] text-sm">{error}</div>
            )}

            <div className="text-sm text-[var(--muted)]">
              Masz już konto?{" "}
              <Link
                to="/login"
                className="text-[var(--accent)] hover:underline"
              >
                Zaloguj się
              </Link>
            </div>
          </form>
        </div>

        {/* ---------------------------------------------------------
           GLASS INFO CARD
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
          <h3 className="text-xl font-semibold mb-3">Wskazówka</h3>

          <p className="text-[var(--muted)] leading-relaxed text-sm">
            Do testów możesz szybko utworzyć kilku użytkowników i sprawdzić,
            że dostęp do cudzych danych jest ograniczony przez JWT.
          </p>
        </div>
      </div>
    </div>
  );
}
