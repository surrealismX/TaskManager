// frontend/src/pages/Dashboard.jsx

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { dbPromise } from "../db/db";
import { listTasksLocal, createTask, updateTask, deleteTask } from "../repo/tasks";
import { pull, online } from "../sync/sync";
import { fmtDate, toInputDateTime, fromInputDateTime } from "../utils/dates";
import { useToast } from "../ui/Toast";

/* ---------------------------------------------------------
   TASK FORM (copied from ProjectDetailPage)
--------------------------------------------------------- */
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
      <div className="label">Nazwa</div>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="label">Opis</div>
      <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="label">Status</div>
      <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="todo">todo</option>
        <option value="in_progress">in_progress</option>
        <option value="done">done</option>
      </select>

      <div className="label">Priorytet</div>
      <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
      </select>

      <div className="label">Termin</div>
      <input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />

      <div className="label">Assigned user id</div>
      <input className="input" value={assigned} onChange={(e) => setAssigned(e.target.value)} />

      <div className="flex justify-end gap-2">
        <button className="btn" type="button" onClick={onCancel}>Anuluj</button>
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? "Zapisywanie…" : "Zapisz"}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------
   MAIN DASHBOARD
--------------------------------------------------------- */
export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [busy, setBusy] = useState(true);

  const [creatingForProject, setCreatingForProject] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const toast = useToast();

  /* ---------------------------------------------------------
     LOAD ALL PROJECTS + ALL TASKS
  --------------------------------------------------------- */
  async function refresh() {
    setBusy(true);
    try {
      if (online()) await pull();

      const db = await dbPromise;
      const proj = await db.getAll("projects");
      setProjects(proj);

      let allTasks = [];
      for (const p of proj) {
        const t = await listTasksLocal(p.key);
        allTasks.push(...t.map((x) => ({ ...x, project: p })));
      }
      setTasks(allTasks);
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

  /* ---------------------------------------------------------
     CATEGORIZE TASKS
  --------------------------------------------------------- */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d.toDateString() === today.toDateString();
  });

  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d < today && t.status !== "done";
  });

  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  const upcomingTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d > today;
  });

  /* ---------------------------------------------------------
     CREATE TASK
  --------------------------------------------------------- */
  async function onCreateTask(projectKey, data) {
    try {
      await createTask({
        projectKey,
        projectServerId: projects.find((p) => p.key === projectKey)?.serverId,
        ...data,
      });

      toast.push({
        title: "Zadanie utworzone",
        desc: online() ? "Zapisano na serwerze." : "Zapisano lokalnie (offline).",
      });

      setCreatingForProject(null);
      await refresh();
    } catch (e) {
      toast.push({
        title: "Nie udało się utworzyć",
        desc: e?.response?.data?.detail || e?.message,
      });
    }
  }

  /* ---------------------------------------------------------
     UPDATE / DELETE / TOGGLE
  --------------------------------------------------------- */
  async function toggleStatus(t) {
    await updateTask(t.key, { status: t.status === "done" ? "todo" : "done" });
    refresh();
  }

  async function removeTask(t) {
    if (!confirm("Usunąć zadanie?")) return;
    await deleteTask(t.key);
    refresh();
  }

  /* ---------------------------------------------------------
     RENDER TASK CARD
  --------------------------------------------------------- */
  function TaskCard({ t }) {
    return (
      <div className="block animate-fadeIn">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {t.project?.title || "Projekt"} • {t.due_date ? fmtDate(t.due_date) : "—"}
            </div>
          </div>

          <span className={`badge ${t.status}`}>{t.status}</span>
        </div>

        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <button className="btn" onClick={() => toggleStatus(t)}>
            {t.status === "done" ? "↩️" : "✓"}
          </button>
          <Link className="btn" to={`/projects/${encodeURIComponent(t.project.key)}`}>
            Otwórz
          </Link>
          <button className="btn danger" onClick={() => removeTask(t)}>
            Usuń
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <div className="container page-animate">

      {/* HEADER */}
      <div className="card card-pad animate-slideUp" style={{ marginBottom: 20 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title">Dashboard</h2>
            <p className="section-sub">
              {new Date().toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          {/* ADD TASK BUTTON + GLASS DROPDOWN */}
          <div style={{ position: "relative" }}>
            <button
              className="btn primary icon-bounce"
              onClick={() => setShowProjectDropdown((v) => !v)}
            >
              + Nowe zadanie ▾
            </button>

            {showProjectDropdown && (
              <div
                className="
                  p-4 rounded-xl
                  backdrop-blur-xl
                  bg-[rgba(255,255,255,0.08)]
                  border border-[rgba(255,255,255,0.15)]
                  shadow-xl
                  animate-fadeIn
                "
                style={{
                  position: "absolute",
                  right: 0,
                  top: "110%",
                  zIndex: 20,
                  minWidth: 220,
                }}
              >
                <div className="label" style={{ marginBottom: 8 }}>
                  Wybierz projekt
                </div>

                {projects.map((p) => (
                  <button
                    key={p.key}
                    className="btn"
                    style={{ width: "100%", marginBottom: 6 }}
                    onClick={() => {
                      setCreatingForProject(p.key);
                      setShowProjectDropdown(false);
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE TASK FORM */}
      {creatingForProject && (
        <div
          className="
            card card-pad animate-slideUp
            backdrop-blur-xl
            bg-[rgba(255,255,255,0.06)]
            border border-[rgba(255,255,255,0.12)]
            shadow-lg
          "
          style={{ marginBottom: 20 }}
        >
          <h3 className="section-title">Nowe zadanie</h3>
          <TaskForm
            initial={null}
            onCancel={() => setCreatingForProject(null)}
            onSave={(data) => onCreateTask(creatingForProject, data)}
          />
        </div>
      )}

      {/* 3-COLUMN KANBAN */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>

        {/* TODAY */}
        <div className="card card-pad animate-fadeIn">
          <h3 className="section-title">Dzisiaj</h3>
          {overdueTasks.length > 0 && (
            <div className="label" style={{ color: "var(--danger)" }}>
              Przeterminowane
            </div>
          )}
          {overdueTasks.map((t) => <TaskCard key={t.key} t={t} />)}
          {todayTasks.map((t) => <TaskCard key={t.key} t={t} />)}
        </div>

        {/* IN PROGRESS */}
        <div className="card card-pad animate-fadeIn">
          <h3 className="section-title">W trakcie</h3>
          {inProgressTasks.map((t) => <TaskCard key={t.key} t={t} />)}
        </div>

        {/* UPCOMING */}
        <div className="card card-pad animate-fadeIn">
          <h3 className="section-title">Nadchodzące</h3>
          {upcomingTasks.map((t) => <TaskCard key={t.key} t={t} />)}
        </div>

      </div>
    </div>
  );
}
