// client/src/lib/storage-adapter.ts
import { indexedDBService } from './indexeddb'
import { fileSystemService } from './filesystem'
import { getStorageMode } from './capacitor'
import type {
  Capture,
  Bucket,
  Folder,
  TaskTemplate,
  InsertCapture,
  InsertBucket,
  InsertFolder,
  InsertTaskTemplate,
  Attachment,
} from '@shared/schema'

/**
 * STORAGE MODE
 * ------------
 * - Server/HTTP mode (default): do NOT set VITE_USE_LOCAL_STORAGE, or set it to "false"
 * - Local/Offline mode: set VITE_USE_LOCAL_STORAGE="true"
 */
function readUseLocalStorageFlag(): boolean {
  // If the env var is exactly the string "true", go local; otherwise default to HTTP mode
  const envFlag = (import.meta as any)?.env?.VITE_USE_LOCAL_STORAGE
  if (typeof envFlag === 'string') return envFlag.toLowerCase() === 'true'
  // Fallback to capacitor helper (kept for backwards compat), but env wins
  return getStorageMode() === 'local'
}

export function shouldUseLocalStorage(): boolean {
  return readUseLocalStorageFlag()
}

/**
 * A minimal fetch-like response we convert back to a real Response.
 */
export interface StorageAdapterResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  json(): Promise<any>
  text(): Promise<string>
}

/**
 * Small helpers
 */
const mockUserId = 'user-123' // matches server's mock user
const jsonHeaders = new Headers({ 'Content-Type': 'application/json' })

function createResponse(data: any, status = 200, statusText = 'OK'): StorageAdapterResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: jsonHeaders,
    async json() {
      return data
    },
    async text() {
      return JSON.stringify(data)
    },
  }
}
function createError(message: string, status = 500) {
  return createResponse({ error: message }, status, 'Error')
}

/**
 * De-dupe utilities to prevent multiples when local data has been seeded more than once.
 */
function dedupeBy<T>(items: T[], keySelector: (t: T) => string) {
  const seen = new Set<string>()
  const out: T[] = []
  for (const it of items) {
    const k = keySelector(it)
    if (k && !seen.has(k)) {
      seen.add(k)
      out.push(it)
    }
  }
  return out
}

function norm(s: string | null | undefined) {
  return (s || '').trim().toLowerCase()
}

/**
 * Local adapter that mirrors your Express routes using IndexedDB underneath.
 */
class LocalStorageAdapter {
  // ---- CAPTURES ------------------------------------------------------------
  private async handleCaptures(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts
    switch (method) {
      case 'GET': {
        if (!p1) {
          const rows = await indexedDBService.getCapturesByUser(mockUserId)
          return createResponse(rows)
        }
        if (p1 === 'bucket' && p2) {
          const rows = await indexedDBService.getCapturesByBucket(p2)
          return createResponse(rows)
        }
        if (p1 === 'folder' && p2) {
          const rows = await indexedDBService.getCapturesByFolder(p2)
          return createResponse(rows)
        }
        const row = await indexedDBService.getCapture(p1)
        if (!row) return createError('Capture not found', 404)
        return createResponse(row)
      }
      case 'POST': {
        if (!data) return createError('Invalid capture data', 400)
        const payload: InsertCapture = { ...(data as InsertCapture), userId: mockUserId }
        const row = await indexedDBService.createCapture(payload)
        return createResponse(row)
      }
      case 'PATCH': {
        if (!p1) return createError('Capture ID required', 400)
        const row = await indexedDBService.updateCapture(p1, data)
        if (!row) return createError('Capture not found', 404)
        return createResponse(row)
      }
      case 'DELETE': {
        if (!p1) return createError('Capture ID required', 400)
        const ok = await indexedDBService.deleteCapture(p1)
        if (!ok) return createError('Capture not found', 404)
        return createResponse({ success: true })
      }
      default:
        return createError(`Method ${method} not allowed`, 405)
    }
  }

  // ---- BUCKETS -------------------------------------------------------------
  private async handleBuckets(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1] = parts
    switch (method) {
      case 'GET': {
        if (!p1) {
          let rows = await indexedDBService.getBucketsByUser(mockUserId)
          // Dedupe default buckets by normalized name
          rows = dedupeBy(rows, (b) => `${b.isDefault ? 'd' : 'c'}::${norm(b.name)}`)
          return createResponse(rows)
        }
        const row = await indexedDBService.getBucket(p1)
        if (!row) return createError('Bucket not found', 404)
        return createResponse(row)
      }
      case 'POST': {
        if (p1 === 'reorder') {
          if (!data?.orderedIds) return createError('Invalid reorder data', 400)
          try {
            const rows = await indexedDBService.reorderBuckets(mockUserId, data.orderedIds)
            return createResponse(rows)
          } catch (e: any) {
            if (typeof e?.message === 'string' && e.message.includes('Invalid bucket IDs')) {
              return createError(e.message, 400)
            }
            throw e
          }
        }
        if (!data) return createError('Invalid bucket data', 400)
        const payload: InsertBucket = { ...(data as InsertBucket), userId: mockUserId }
        // If creating a *default* bucket with a name that already exists, skip duplicate
        if (payload.isDefault) {
          const existing = await indexedDBService.getBucketsByUser(mockUserId)
          const dup = existing.find((b) => b.isDefault && norm(b.name) === norm(payload.name))
          if (dup) return createResponse(dup, 200) // idempotent create for defaults
        }
        const row = await indexedDBService.createBucket(payload)
        return createResponse(row)
      }
      default:
        return createError(`Method ${method} not allowed`, 405)
    }
  }

  // ---- FOLDERS -------------------------------------------------------------
  private async handleFolders(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts
    switch (method) {
      case 'GET': {
        if (p1 === 'bucket' && p2) {
          const rows = await indexedDBService.getFoldersByBucket(p2)
          return createResponse(rows)
        }
        if (p1) {
          const row = await indexedDBService.getFolder(p1)
          if (!row) return createError('Folder not found', 404)
          return createResponse(row)
        }
        return createError('Invalid folder request', 400)
      }
      case 'POST': {
        if (!data) return createError('Invalid folder data', 400)
        const row = await indexedDBService.createFolder(data as InsertFolder)
        return createResponse(row)
      }
      default:
        return createError(`Method ${method} not allowed`, 405)
    }
  }

  // ---- TASK TEMPLATES ------------------------------------------------------
  private async handleTemplates(method: string, _parts: string[], data?: any): Promise<StorageAdapterResponse> {
    switch (method) {
      case 'GET': {
        let rows = await indexedDBService.getTaskTemplates(mockUserId)
        // Keep at most one default template per (category,name)
        rows = dedupeBy(rows, (t) => `${t.isDefault ? 'd' : 'c'}::${norm(t.category)}::${norm(t.name)}`)
        return createResponse(rows)
      }
      case 'POST': {
        if (!data) return createError('Invalid template data', 400)
        const payload: InsertTaskTemplate = { ...(data as InsertTaskTemplate), userId: mockUserId }
        // Idempotent create for defaults
        if (payload.isDefault) {
          const existing = await indexedDBService.getTaskTemplates(mockUserId)
          const dup = existing.find(
            (t) => t.isDefault && norm(t.category) === norm(payload.category) && norm(t.name) === norm(payload.name),
          )
          if (dup) return createResponse(dup, 200)
        }
        const row = await indexedDBService.createTaskTemplate(payload)
        return createResponse(row)
      }
      default:
        return createError(`Method ${method} not allowed`, 405)
    }
  }

  // ---- REMINDERS -----------------------------------------------------------
  private async handleReminders(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts
    switch (method) {
      case 'GET': {
        if (p1 === 'due') {
          const before = data?.before ? new Date(data.before) : undefined
          const rows = await indexedDBService.getCapturesDue(mockUserId, before)
          return createResponse(rows)
        }
        const rows = await indexedDBService.getCapturesWithReminders(mockUserId)
        return createResponse(rows)
      }
      case 'POST': {
        if (p2 === 'notified') {
          if (!p1) return createError('Capture ID required', 400)
          await indexedDBService.updateReminderNotified(p1)
          return createResponse({ success: true })
        }
        return createError('Invalid reminder endpoint', 400)
      }
      default:
        return createError(`Method ${method} not allowed`, 405)
    }
  }

  // ---- UPLOAD --------------------------------------------------------------
  private async handleUpload(method: string, data?: any): Promise<StorageAdapterResponse> {
    if (method !== 'POST') return createError(`Method ${method} not allowed`, 405)
    if (!data?.file) return createError('No file uploaded', 400)

    const validation = await fileSystemService.validateFile(data.file)
    if (!validation.isValid) return createError(validation.error || 'Invalid file', 400)

    const attachment = await fileSystemService.saveFile(
      data.file,
      validation.fileInfo?.name || 'unknown',
      validation.fileInfo?.type || 'application/octet-stream',
    )
    return createResponse(attachment)
  }

  // ---- ROUTER --------------------------------------------------------------
  async handleRequest(method: string, url: string, data?: any): Promise<StorageAdapterResponse> {
    try {
      const parts = url.replace('/api/', '').split('/')
      const head = parts[0]
      switch (head) {
        case 'captures':
          return this.handleCaptures(method, parts, data)
        case 'buckets':
          return this.handleBuckets(method, parts, data)
        case 'folders':
          return this.handleFolders(method, parts, data)
        case 'task-templates':
          return this.handleTemplates(method, parts, data)
        case 'reminders':
          return this.handleReminders(method, parts, data)
        case 'upload':
          return this.handleUpload(method, data)
        default:
          return createError(`Unknown endpoint: ${head}`, 404)
      }
    } catch (e: any) {
      console.error('Storage adapter error:', e)
      return createError(e?.message || 'Internal error', 500)
    }
  }
}

export const storageAdapter = new LocalStorageAdapter()

/**
 * Main request function: routes to local adapter or real HTTP fetch.
 */
export async function adaptedApiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  if (shouldUseLocalStorage()) {
    const r = await storageAdapter.handleRequest(method, url, data)
    return new Response(await r.text(), {
      status: r.status,
      statusText: r.statusText,
      headers: r.headers,
    })
  }

  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  })
  return res
}

/**
 * File upload that works in both modes.
 */
export async function adaptedFileUpload(file: File): Promise<Attachment> {
  if (shouldUseLocalStorage()) {
    const validation = await fileSystemService.validateFile(file)
    if (!validation.isValid) throw new Error(validation.error || 'Invalid file')
    return fileSystemService.saveFile(file, file.name, file.type)
  }

  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res.json()
}

}

/**
 * Enhanced file upload handler that works with both environments
 */
export async function adaptedFileUpload(file: File): Promise<Attachment> {
  if (shouldUseLocalStorage()) {
    // Use filesystem service directly
    const validation = await fileSystemService.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }
    return fileSystemService.saveFile(file, file.name, file.type);
  }

  // HTTP upload endpoint
  const formData = new FormData();
  formData.append('file', file);

  const uploadUrl = `${API_BASE}/api/upload`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  return response.json();
}
