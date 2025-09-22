// client/src/lib/db.ts
import { openDB, IDBPDatabase } from "idb"

export type TemplateField = { key: string; label: string; type: "text" | "url" | "number" | "date" }
export type Template = { id: string; name: string; fields: TemplateField[] }
export type Bucket = { id: string; name: string }
export type Item = { id: string; bucketId: string; templateId?: string; data?: Record<string, unknown>; createdAt: number }

type DBSchema = {
  templates: Template
  buckets: Bucket
  items: Item
  meta: { key: string; value: string }
}

let dbp: Promise<IDBPDatabase<any>> | null = null

export function getDB() {
  if (!dbp) {
    dbp = openDB<any>("brainbucket-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("templates")) db.createObjectStore("templates", { keyPath: "id" })
        if (!db.objectStoreNames.contains("buckets")) db.createObjectStore("buckets", { keyPath: "id" })
        if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "id" })
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" })
      },
    })
  }
  return dbp
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const SEED_KEY = "seed_v2"

export async function ensureSeeded() {
  const db = await getDB()
  const tx = db.transaction(["meta", "templates", "buckets", "items"], "readwrite")
  const meta = tx.objectStore("meta")
  const already = await meta.get(SEED_KEY)
  if (already === "done") {
    await tx.done
    return
  }

  const templates = tx.objectStore("templates")
  const buckets = tx.objectStore("buckets")
  const items = tx.objectStore("items")

  await templates.put({ id: uid(), name: "Quick Task", fields: [{ key: "title", label: "Title", type: "text" }] })
  await templates.put({ id: uid(), name: "Idea", fields: [{ key: "title", label: "Working Title", type: "text" }] })
  await templates.put({
    id: uid(),
    name: "Reference",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "url", label: "URL", type: "url" },
    ],
  })

  const inboxId = uid(),
    todayId = uid(),
    ideasId = uid(),
    refsId = uid()

  await buckets.put({ id: inboxId, name: "Inbox" })
  await buckets.put({ id: todayId, name: "Today" })
  await buckets.put({ id: ideasId, name: "Ideas" })
  await buckets.put({ id: refsId, name: "References" })

  await items.put({ id: uid(), bucketId: inboxId, createdAt: Date.now(), data: { title: "Welcome to BrainBucket" } })

  await meta.put({ key: SEED_KEY, value: "done" })
  await tx.done
}

export async function forceReseed() {
  const db = await getDB()
  const tx = db.transaction(["meta", "templates", "buckets", "items"], "readwrite")
  tx.objectStore("templates").clear()
  tx.objectStore("buckets").clear()
  tx.objectStore("items").clear()
  tx.objectStore("meta").delete(SEED_KEY)
  await tx.done
  await ensureSeeded()
}

export async function listTemplates(): Promise<Template[]> {
  const db = await getDB()
  return db.getAll("templates")
}

export async function listBuckets(): Promise<Bucket[]> {
  const db = await getDB()
  return db.getAll("buckets")
}

export async function createBucket(name: string): Promise<Bucket> {
  const db = await getDB()
  const bucket = { id: uid(), name }
  await db.put("buckets", bucket)
  return bucket
}

export async function createItem(bucketId: string, data: Record<string, unknown> = {}, templateId?: string): Promise<Item> {
  const db = await getDB()
  const item: Item = { id: uid(), bucketId, templateId, data, createdAt: Date.now() }
  await db.put("items", item)
  return item
}

// tiny debug helpers
export async function snapshot() {
  const db = await getDB()
  const [templates, buckets, items] = await Promise.all([db.getAll("templates"), db.getAll("buckets"), db.getAll("items")])
  return { templates, buckets, items }
}
