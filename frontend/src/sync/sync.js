import api from "../api/client";
import { dbPromise, makeServerKey } from "../db/db";

const isoNow = () => new Date().toISOString();

export const online = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

// ------- pull -------
export async function pull() {
  const db = await dbPromise;
  const [pRes, tRes] = await Promise.all([api.get("/projects"), api.get("/tasks")]);
  const projects = pRes.data;
  const tasks = tRes.data;

  const txP = db.transaction("projects", "readwrite");
  for (const p of projects) {
    txP.store.put({
      key: makeServerKey("project", p.id),
      serverId: p.id,
      title: p.title,
      description: p.description || "",
      modifiedAt: isoNow(),
    });
  }
  await txP.done;

  const txT = db.transaction("tasks", "readwrite");
  for (const t of tasks) {
    txT.store.put({
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
    });
  }
  await txT.done;
}

// ------- push -------
export async function pushOutbox() {
  const db = await dbPromise;
  const items = await db.getAll("outbox");
  items.sort((a, b) => a.ts.localeCompare(b.ts));

  for (const item of items) {
    try {
      if (item.op === "PROJECT_CREATE") {
        const res = await api.post("/projects/", item.body);
        const created = res.data;
        const newKey = makeServerKey("project", created.id);
        const old = await db.get("projects", item.localKey);
        if (old) {
          await db.delete("projects", item.localKey);
          await db.put("projects", { ...old, key: newKey, serverId: created.id, modifiedAt: isoNow() });
        }

        // relink tasks that pointed to local project key
        const tx = db.transaction("tasks", "readwrite");
        const idx = tx.store.index("byProjectKey");
        for await (const cursor of idx.iterate(item.localKey)) {
          await cursor.update({ ...cursor.value, projectKey: newKey, modifiedAt: isoNow() });
        }
        await tx.done;

        // оновити queued TASK_CREATE (project_id:null) для задач цього проєкту
        const outTx = db.transaction(["outbox", "tasks"], "readwrite");
        for await (const c of outTx.objectStore("outbox").iterate()) {
          const ob = c.value;
          if (ob.op !== "TASK_CREATE" || ob.body?.project_id) continue;
          const task = await outTx.objectStore("tasks").get(ob.localKey);
          if (task?.projectKey === newKey) {
            await c.update({
              ...ob,
              body: { ...ob.body, project_id: created.id },
            });
          }
        }
        await outTx.done;
      }

      if (item.op === "PROJECT_UPDATE") {
        await api.put(`/projects/${item.serverId}`, item.body);
      }
      if (item.op === "PROJECT_DELETE") {
        await api.delete(`/projects/${item.serverId}`);
      }

      if (item.op === "TASK_CREATE") {
        // Якщо задача створена офлайн, але проєкт ще не синхронізований — чекаємо.
        if (!item.body?.project_id) continue;
        const res = await api.post("/tasks/", item.body);
        const created = res.data;
        const newKey = makeServerKey("task", created.id);
        const old = await db.get("tasks", item.localKey);
        if (old) {
          await db.delete("tasks", item.localKey);
          await db.put("tasks", { ...old, key: newKey, serverId: created.id, updated_at: created.updated_at, modifiedAt: isoNow() });
        }
      }
      if (item.op === "TASK_UPDATE") {
        await api.put(`/tasks/${item.serverId}`, item.body);
      }
      if (item.op === "TASK_DELETE") {
        await api.delete(`/tasks/${item.serverId}`);
      }

      await db.delete("outbox", item.id);
    } catch (e) {
      const status = e?.response?.status;
      if (!online() || !status) break;
      if ([400, 401, 403, 404].includes(status)) {
        await db.delete("outbox", item.id);
      } else {
        break;
      }
    }
  }
}

export async function syncNow() {
  if (!online()) return;
  await pushOutbox();
  await pull();
}
