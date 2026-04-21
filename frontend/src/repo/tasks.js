import api from "../api/client";
import { dbPromise, makeLocalKey, makeServerKey } from "../db/db";
import { online } from "../sync/sync";

const isoNow = () => new Date().toISOString();

export async function listTasksLocal(projectKey) {
  const db = await dbPromise;
  const all = await db.getAllFromIndex("tasks", "byProjectKey", projectKey);
  // newest first
  return all.sort((a, b) => (b.modifiedAt || "").localeCompare(a.modifiedAt || ""));
}

export async function createTask({ projectKey, projectServerId, title, description, status, priority, due_date, assigned_user_id }) {
  const db = await dbPromise;
  if (online() && projectServerId) {
    const res = await api.post("/tasks/", {
      project_id: projectServerId,
      title,
      description,
      status,
      priority,
      due_date,
      assigned_user_id,
    });
    const t = res.data;
    const rec = {
      key: makeServerKey("task", t.id),
      serverId: t.id,
      projectKey: makeServerKey("project", t.project_id),
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assigned_user_id: t.assigned_user_id,
      created_at: t.created_at,
      updated_at: t.updated_at,
      modifiedAt: isoNow(),
    };
    await db.put("tasks", rec);
    return rec;
  }

  const key = makeLocalKey("task");
  const rec = {
    key,
    serverId: null,
    projectKey,
    title,
    description: description || "",
    status,
    priority,
    due_date,
    assigned_user_id,
    created_at: isoNow(),
    updated_at: isoNow(),
    modifiedAt: isoNow(),
  };
  await db.put("tasks", rec);

  // Якщо проєкт ще не має serverId — створення задачі зможе піти лише після sync, коли push створить проект і перелінкує ключ.
  await db.put("outbox", {
    id: crypto.randomUUID(),
    ts: isoNow(),
    op: "TASK_CREATE",
    localKey: key,
    body: {
      project_id: projectServerId, // може бути null, тоді item відправиться тільки після релінку проєкту і повторного натискання Sync
      title,
      description,
      status,
      priority,
      due_date,
      assigned_user_id,
    },
  });
  return rec;
}

export async function updateTask(taskKey, patch) {
  const db = await dbPromise;
  const current = await db.get("tasks", taskKey);
  if (!current) return;
  const next = { ...current, ...patch, updated_at: isoNow(), modifiedAt: isoNow() };
  await db.put("tasks", next);

  if (online() && current.serverId) {
    await api.put(`/tasks/${current.serverId}`, patch);
    return;
  }

  if (current.serverId) {
    await db.put("outbox", {
      id: crypto.randomUUID(),
      ts: isoNow(),
      op: "TASK_UPDATE",
      serverId: current.serverId,
      body: patch,
    });
  } else {
    // локальна задача: створення вже в черзі; просто оновлюємо її body (додаємо ще один TASK_CREATE з актуальним body)
    await db.put("outbox", {
      id: crypto.randomUUID(),
      ts: isoNow(),
      op: "TASK_CREATE",
      localKey: taskKey,
      body: {
        project_id: null,
        title: next.title,
        description: next.description,
        status: next.status,
        priority: next.priority,
        due_date: next.due_date,
        assigned_user_id: next.assigned_user_id,
      },
    });
  }
}

export async function deleteTask(taskKey) {
  const db = await dbPromise;
  const current = await db.get("tasks", taskKey);
  if (!current) return;
  await db.delete("tasks", taskKey);

  if (online() && current.serverId) {
    await api.delete(`/tasks/${current.serverId}`);
    return;
  }

  if (current.serverId) {
    await db.put("outbox", {
      id: crypto.randomUUID(),
      ts: isoNow(),
      op: "TASK_DELETE",
      serverId: current.serverId,
    });
  }
}
