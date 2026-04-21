import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dbPromise } from "../db/db";
import {
  listTasksLocal,
  createTask,
  deleteTask,
  updateTask,
} from "../repo/tasks";
import {
  fmtDate,
  fromInputDateTime,
  toInputDateTime,
} from "../utils/dates";
import { pull, online } from "../sync/sync";
import { useToast } from "../ui/Toast";

const STATUSES = [
  { v: "todo", label: "todo" },
  { v: "in_progress", label: "in_progress" },
  { v: "done", label: "done" },
];

const PRIORITIES = [
  { v: "low", label: "low" },
  { v: "medium", label: "medium" },
  { v: "high", label: "high" },
];

function TaskForm({ initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(initial?.status || "todo");
  const [priority, setPriority] = useState(initial?.priority || "medium");
  const [due, setDue] = useState(toInputDateTime(initial?.due_date) || "");
  const [assigned, setAssigned] = useState(initial?.assigned_user_id ?? "");
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
        status,
        priority,
        due_date: fromInputDateTime(due),
        assigned_user_id: assigned === "" ? null : Number(assigned),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="label">Nazwa</div>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <div className="label">Termin (due date)</div>
          <input
            className="input"
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <div className="label">Opis</div>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <div className="label">Status</div>
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="label">Priorytet</div>
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="label">Assigned user id (opcjonalnie)</div>
          <input
            className="input"
            inputMode="numeric"
            value={assigned}
            onChange={(e) => setAssigned(e.target.value)}
            placeholder="na przykład 1"
          />
          <div className="label text-xs opacity-70">
            (w backendzie nie ma endpointu listy users — dlatego tutaj tylko
            numeryczny id)
          </div>
        </div>
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

export default function ProjectDetailPage() {
  const { projectKey } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [busy, setBusy] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingKey, setEditingKey] = useState(null);

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPrio, setFPrio] = useState("");
  const [fDueFrom, setFDueFrom] = useState("");
  const [fDueTo, setFDueTo] = useState("");

  const toast = useToast();

  async function loadLocal() {
    const db = await dbPromise;
    const p = await db.get("projects", projectKey);
    setProject(p || null);
    const list = await listTasksLocal(projectKey);
    setTasks(list);
  }

  async function refresh() {
    setBusy(true);
    try {
      if (online()) await pull();
      await loadLocal();
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
  }, [projectKey]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const from = fDueFrom ? new Date(fDueFrom).getTime() : null;
    const to = fDueTo ? new Date(fDueTo).getTime() : null;

    return tasks.filter((t) => {
      if (needle) {
        const hay = `${t.title || ""} ${t.description || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (fStatus && t.status !== fStatus) return false;
      if (fPrio && t.priority !== fPrio) return false;

      if (from !== null) {
        const dd = t.due_date ? new Date(t.due_date).getTime() : null;
        if (dd === null || dd < from) return false;
      }

      if (to !== null) {
        const dd = t.due_date ? new Date(t.due_date).getTime() : null;
        if (dd === null || dd > to) return false;
      }

      return true;
    });
  }, [tasks, q, fStatus, fPrio, fDueFrom, fDueTo]);

  const editing = tasks.find((t) => t.key === editingKey);

  async function onCreate(data) {
    try {
      await createTask({
        projectKey,
        projectServerId: project?.serverId,
        ...data,
      });
      toast.push({
        title: "Zadanie utworzone",
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

  async function onUpdate(key, patch) {
    try {
      await updateTask(key, patch);
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
    if (!confirm("Usunąć zadanie?")) return;
    try {
      await deleteTask(key);
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

  async function quickStatus(t, status) {
    await onUpdate(t.key, { status });
  }

  if (!project && !busy) {
    return (
      <div className="max-w-3xl mx-auto">
        <div
          className="
            p-6 rounded-2xl
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.08)]
            border border-[rgba(255,255,255,0.15)]
            shadow-xl
          "
        >
          <div className="flex items-center gap-3">
            <b>Projekt nie znaleziony</b>
            <div className="flex-1" />
            <Link className="btn" to="/">
              Wróć
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4">

      {/* ---------------------------------------------------------
         HEADER (glass)
      --------------------------------------------------------- */}
      <div
        className="
          p-6 rounded-2xl
          backdrop-blur-xl
          bg-[rgba(255,255,255,0.08)]
          border border-[rgba(255,255,255,0.15)]
          shadow-xl
          animate-fadeIn
        "
      >
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link className="btn" to="/">
              ← Projekty
            </Link>
            <h2 className="text-xl font-bold m-0 truncate">
              {project?.title || "…"}
            </h2>
            <span className="pill">
              {project?.serverId ? `id:${project.serverId}` : "local"}
            </span>
          </div>

          <div className="flex-1" />

          <button
            className="btn primary"
            onClick={() => setCreating(true)}
          >
            + Nowe zadanie
          </button>
          <button className="btn" onClick={refresh} disabled={busy}>
            {busy ? "Odświeżanie…" : "Odśwież"}
          </button>
        </div>

        <div className="text-sm text-[var(--muted)] mt-3">
          {project?.description || "Brak opisu"}
        </div>
      </div>

      {/* ---------------------------------------------------------
         CREATE / EDIT TASK (glass)
      --------------------------------------------------------- */}
      {(creating || editing) && (
        <div
          className="
            p-6 rounded-2xl
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.06)]
            border border-[rgba(255,255,255,0.12)]
            shadow-lg
            animate-slideUp
          "
        >
          <div className="flex items-center mb-4 gap-3">
            <b>{editing ? "Edycja zadania" : "Nowe zadanie"}</b>
            <div className="flex-1" />
            {!project?.serverId && !online() && (
              <span className="pill bad">
                Offline + lokalny projekt: zsynchronizuj projekt przed
                wysłaniem zadań
              </span>
            )}
          </div>

          <TaskForm
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

      {/* ---------------------------------------------------------
         FILTERS (glass)
      --------------------------------------------------------- */}
      <div
        className="
          p-6 rounded-2xl
          backdrop-blur-xl
          bg-[rgba(255,255,255,0.06)]
          border border-[rgba(255,255,255,0.12)]
          shadow-lg
          animate-fadeIn
        "
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <div className="label">Szukaj</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="nazwa lub opis"
            />
          </div>

          <div>
            <div className="label">Status</div>
            <select
              className="select"
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
            >
              <option value="">wszystkie</option>
              {STATUSES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Priorytet</div>
            <select
              className="select"
              value={fPrio}
              onChange={(e) => setFPrio(e.target.value)}
            >
              <option value="">wszystkie</option>
              {PRIORITIES.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Termin od</div>
            <input
              className="input"
              type="date"
              value={fDueFrom}
              onChange={(e) => setFDueFrom(e.target.value)}
            />
          </div>

          <div>
            <div className="label">Termin do</div>
            <input
              className="input"
              type="date"
              value={fDueTo}
              onChange={(e) => setFDueTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
         TASKS TABLE (glass)
      --------------------------------------------------------- */}
      <div
        className="
          p-6 rounded-2xl
          backdrop-blur-xl
          bg-[rgba(255,255,255,0.06)]
          border border-[rgba(255,255,255,0.12)]
          shadow-lg
          overflow-x-auto
          animate-fadeIn
        "
      >
        <table className="table" style={{ width: "100%", minWidth: 700 }}>
          <thead>
            <tr>
              <th>Zadanie</th>
              <th>Status</th>
              <th>Priorytet</th>
              <th>Termin</th>
              <th>Assigned user</th>
              <th style={{ textAlign: "right" }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.key} className="animate-fadeIn">
                <td>
                  <div
                    style={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.description || "Brak opisu"}
                  </div>
                  <div
                    className="row"
                    style={{
                      marginTop: 6,
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="pill">
                      {t.serverId ? `id:${t.serverId}` : "local"}
                    </span>
                    <span className="pill">
                      upd: {fmtDate(t.updated_at)}
                    </span>
                  </div>
                </td>

                <td>
                  <span className={`badge ${t.status}`}>{t.status}</span>
                </td>

                <td>
                  <span className="badge">{t.priority}</span>
                </td>

                <td style={{ whiteSpace: "nowrap" }}>
                  {t.due_date ? fmtDate(t.due_date) : "—"}
                </td>

                <td>{t.assigned_user_id ?? "—"}</td>

                <td>
                  <div
                    className="row"
                    style={{
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      gap: 4,
                    }}
                  >
                    <button
                      className="btn"
                      onClick={() => setEditingKey(t.key)}
                    >
                      Edytuj
                    </button>
                    <button
                      className="btn"
                      onClick={() =>
                        quickStatus(
                          t,
                          t.status === "done" ? "todo" : "done"
                        )
                      }
                    >
                      {t.status === "done" ? "↩️ todo" : "✓ done"}
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => onDelete(t.key)}
                    >
                      Usuń
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!busy && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ color: "var(--muted)", paddingTop: 8 }}
                >
                  Brak zadań dla aktualnych filtrów.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
