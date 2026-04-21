import api from "../api/client";
import { dbPromise, makeLocalKey, makeServerKey } from "../db/db";
import { online } from "../sync/sync";

const isoNow = () => new Date().toISOString();

export async function listProjectsLocal() {
  const db = await dbPromise;
  const all = await db.getAll("projects");
  // newest first
  return all.sort((a, b) => (b.modifiedAt || "").localeCompare(a.modifiedAt || ""));
}

export async function upsertProjectLocal(project) {
  const db = await dbPromise;
  await db.put("projects", project);
}

export async function createProject({ title, description }) {
  const db = await dbPromise;
  const isOn = online();

  if (isOn) {
    const res = await api.post("/projects/", { title, description });
    const p = res.data;
    const rec = {
      key: makeServerKey("project", p.id),
      serverId: p.id,
      title: p.title,
      description: p.description || "",
      modifiedAt: isoNow(),
    };
    await db.put("projects", rec);
    return rec;
  }

  const key = makeLocalKey("project");
  const rec = { key, serverId: null, title, description: description || "", modifiedAt: isoNow() };
  await db.put("projects", rec);
  await db.put("outbox", {
    id: crypto.randomUUID(),
    ts: isoNow(),
    op: "PROJECT_CREATE",
    url: "/projects/",
    body: { title, description },
    localKey: key,
  });
  return rec;
}

export async function updateProject(projectKey, patch) {
  const db = await dbPromise;
  const current = await db.get("projects", projectKey);
  if (!current) return;
  const next = { ...current, ...patch, modifiedAt: isoNow() };
  await db.put("projects", next);

  if (online() && current.serverId) {
    await api.put(`/projects/${current.serverId}`, patch);
    return;
  }

  if (current.serverId) {
    await db.put("outbox", {
      id: crypto.randomUUID(),
      ts: isoNow(),
      op: "PROJECT_UPDATE",
      serverId: current.serverId,
      body: patch,
    });
  } else {
    // локально створений проєкт: просто оновлюємо локально; create піде пізніше з актуальними полями
    await db.put("outbox", {
      id: crypto.randomUUID(),
      ts: isoNow(),
      op: "PROJECT_CREATE",
      url: "/projects/",
      body: { title: next.title, description: next.description },
      localKey: projectKey,
    });
  }
}

export async function deleteProject(projectKey) {
  const db = await dbPromise;
  const current = await db.get("projects", projectKey);
  if (!current) return;

  // delete local tasks of that project
  const tx = db.transaction("tasks", "readwrite");
  const idx = tx.store.index("byProjectKey");
  const keys = [];
  for await (const cursor of idx.iterate(projectKey)) {
    keys.push(cursor.primaryKey);
  }
  for (const k of keys) await tx.store.delete(k);
  await tx.done;

  await db.delete("projects", projectKey);

  if (online() && current.serverId) {
    await api.delete(`/projects/${current.serverId}`);
    return;
  }

  if (current.serverId) {
    await db.put("outbox", {
      id: crypto.randomUUID(),
      ts: isoNow(),
      op: "PROJECT_DELETE",
      serverId: current.serverId,
    });
  }
}
