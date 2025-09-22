// client/src/lib/db.ts
import { openDB, IDBPDatabase } from 'idb'

type TemplateField = { key: string; label: string; type: 'text'|'url'|'number'|'date' }
export type Template = { id: string; name: string; fields: TemplateField[] }
export type Bucket = { id: string; name: string }
export type Item = { id: string; bucketId: string; templateId?: string; data?: Record<string, unknown>; createdAt: number }

type DBSchema = {
  templates: Template
  buckets: Bucket
  items: Item
  meta: { key: string; value: string }
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<any>('brainbucket-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('buckets')) db.createObjectStore('buckets', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      }
    })
  }
  return dbPromise
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function ensureSeeded() {
  const db = await getDB()
  const tx = db.transaction(['meta','templates','buckets','items'], 'readwrite')
  const meta = tx.objectStore('meta')
  const already = await meta.get('seed_v1')
  if (already === 'done') { await tx.done; return }

  const templates = tx.objectStore('templates')
  const buckets   = tx.objectStore('buckets')
  const items     = tx.objectStore('items')

  // Seed some safe defaults
  await templates.put({ id: uid(), name: 'Quick Task', fields: [{ key: 'title', label: 'Title', type: 'text' }] })
  await templates.put({ id: uid(), name: 'Idea',       fields: [{ key: 'title', label: 'Working Title', type: 'text' }] })
  await templates.put({ id: uid(), name: 'Reference',  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'url',   label: 'URL',   type: 'url' }
  ]})

  const inboxId = uid(), todayId = uid(), ideasId = uid(), refsId = uid()
  await buckets.put({ id: inboxId, name: 'Inbox' })
  await buckets.put({ id: todayId, name: 'Today' })
  await buckets.put({ id: ideasId, name: 'Ideas' })
  await buckets.put({ id: refsId,  name: 'References' })

  // Optional example item so UI isn’t empty
  await items.put({ id: uid(), bucketId: inboxId, createdAt: Date.now(), data: { title: 'Welcome to BrainBucket' } })

  await meta.put({ key: 'seed_v1', value: 'done' })
  await tx.done
}

export async function readAll() {
  const db = await getDB()
  const [templates, buckets] = await Promise.all([
    db.getAll('templates'), db.getAll('buckets')
  ])
  return { templates, buckets }
}
