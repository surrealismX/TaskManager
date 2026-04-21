// frontend/src/pages/Projects.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listProjectsLocal,
  createProject,
  deleteProject,
  updateProject,
} from "../repo/projects";
import { pull, online } from "../sync/sync";
import { useToast } from "../ui/Toast";

/* ---------------------------------------------------------
   PROJECT FORM
--------------------------------------------------------- */
function ProjectForm({ initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.push({
        title: "Sprawdź dane",
        desc: "Nazwa musi mieć co najmniej 2 znaki.",
      });
      return;
    }
    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-1">
        <label className="label">Nazwa</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Opis</label>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn" type="button" onClick={onCancel}>
          Anuluj
        </button>
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? "Zapisywanie…" : "Zapisz"}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------
   MAIN PAGE
--------------------------------------------------------- */
export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [query, setQuery] = useState("");
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  async function refresh() {
    setBusy(true);
    try {
      if (online()) {
        await pull();
      }
      const list = await listProjectsLocal();
      setProjects(list);
    } catch (e) {
      toast.push({
        title: "Błąd",
        desc: e?.response?.data?.detail || e?.message,
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(data) {
    try {
      await createProject(data);
      toast.push({
        title: "Projekt utworzony",
        desc: online()
          ? "Zapisano na serwerze."
          : "Zapisano lokalnie (offline).",
      });
      setCreating(false);
      await refresh();
    } catch (e) {
      toast.push({
        title: "Nie udało się utworzyć",
        desc: e?.response?.data?.detail || e?.message,
      });
    }
  }

  async function onUpdate(key, data) {
    try {
      await updateProject(key, data);
      toast.push({
        title: "Zaktualizowano",
        desc: online()
          ? "Zmiany wysłane na serwer."
          : "Zmiany dodane do kolejki (offline).",
      });
      setEditingKey(null);
      await refresh();
    } catch (e) {
      toast.push({
        title: "Nie udało się zaktualizować",
        desc: e?.response?.data?.detail || e?.message,
      });
    }
  }

  async function onDelete(key) {
    if (!confirm("Usunąć projekt razem z zadaniami?")) return;
    try {
      await deleteProject(key);
      toast.push({
        title: "Usunięto",
        desc: online()
          ? "Usunięto na serwerze."
          : "Usunięcie dodane do kolejki (offline).",
      });
      await refresh();
    } catch (e) {
      toast.push({
        title: "Nie udało się usunąć",
        desc: e?.response?.data?.detail || e?.message,
      });
    }
  }

  const editing = projects.find((p) => p.key === editingKey);

  return (
    <div className="container page-animate">

      {/* HEADER */}
      <div className="card card-pad animate-slideUp" style={{ marginBottom: "20px" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">Projekty</h2>
            <p className="section-sub">
              {busy ? "Odświeżanie…" : `${projects.length} projekt(y)`}
            </p>
          </div>

          <div className="row" style={{ gap: "10px" }}>
            <input
              className="input"
              style={{ maxWidth: 260 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj…"
            />

            <button className="btn primary icon-bounce" onClick={() => setCreating(true)}>
              + Nowy
            </button>

            <button className="btn icon-bounce" onClick={refresh} disabled={busy}>
              Odśwież
            </button>
          </div>
        </div>

        {/* CREATE / EDIT FORM */}
        {(creating || editing) && (
          <div className="card card-pad animate-fadeIn" style={{ marginTop: "20px" }}>
            <div className="row" style={{ marginBottom: "10px" }}>
              <b>{editing ? "Edycja projektu" : "Nowy projekt"}</b>
              <div className="spacer" />
              <span className="pill">{online() ? "server" : "offline"}</span>
            </div>

            <ProjectForm
              initial={editing || null}
              onCancel={() => {
                setCreating(false);
                setEditingKey(null);
              }}
              onSave={(data) =>
                editing ? onUpdate(editing.key, data) : onCreate(data)
              }
            />
          </div>
        )}
      </div>

      {/* PROJECT LIST */}
      <div className="grid">
        {filtered.map((p) => (
          <div
            key={p.key}
            className="card card-pad animate-fadeIn"
            style={{ marginBottom: "14px" }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>{p.title}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  {p.description || "Brak opisu"}
                </div>
              </div>

              <span className="pill">
                {p.serverId ? `id:${p.serverId}` : "local"}
              </span>
            </div>

            <div className="row" style={{ marginTop: "10px", justifyContent: "space-between" }}>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Zadania: {p.tasksCount ?? 0}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Termin: {p.deadline || "—"}
              </div>
            </div>

            <div className="timeline-bar">
              <div
                className="timeline-fill"
                style={{ width: `${p.progress ?? 0}%` }}
              />
            </div>

            <div className="row" style={{ marginTop: "14px", justifyContent: "flex-end", gap: "10px" }}>
              <Link className="btn" to={`/projects/${encodeURIComponent(p.key)}`}>
                Otwórz
              </Link>
              <button className="btn" onClick={() => setEditingKey(p.key)}>
                Edytuj
              </button>
              <button className="btn danger" onClick={() => onDelete(p.key)}>
                Usuń
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE — FULL WIDTH */}
      {!busy && filtered.length === 0 && (
        <div
          className="
            card card-pad animate-fadeIn
            flex flex-col items-center justify-center
            w-full
          "
          style={{
            textAlign: "center",
            marginTop: "20px",
            padding: "40px",
          }}
        >
          <div style={{ fontSize: "60px", marginBottom: "16px" }}>📂</div>
          <h3 style={{ fontSize: "22px", marginBottom: "8px" }}>Brak projektów</h3>
          <p style={{ color: "var(--muted)", marginBottom: "20px", fontSize: "15px" }}>
            Dodaj swój pierwszy projekt, aby rozpocząć.
          </p>
          <button className="btn primary icon-bounce" onClick={() => setCreating(true)}>
            + Nowy projekt
          </button>
        </div>
      )}

    </div>
  );
}
