import { openDB } from "idb";

const DB_NAME = "taskmanager";
const DB_VERSION = 1;

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("projects")) {
      const s = db.createObjectStore("projects", { keyPath: "key" });
      s.createIndex("byServerId", "serverId", { unique: true });
    }
    if (!db.objectStoreNames.contains("tasks")) {
      const s = db.createObjectStore("tasks", { keyPath: "key" });
      s.createIndex("byServerId", "serverId", { unique: true });
      s.createIndex("byProjectKey", "projectKey");
    }
    if (!db.objectStoreNames.contains("outbox")) {
      db.createObjectStore("outbox", { keyPath: "id" });
    }
  },
});

export function makeLocalKey(kind) {
  return `l:${kind}:${crypto.randomUUID()}`;
}

export function makeServerKey(kind, id) {
  return `s:${kind}:${id}`;
}

export async function clearAllLocal() {
  const db = await dbPromise;
  await Promise.all([db.clear("projects"), db.clear("tasks"), db.clear("outbox")]);
}
