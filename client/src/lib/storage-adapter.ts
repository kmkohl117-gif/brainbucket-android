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
 * Storage Adapter that provides HTTP API-compatible interface over IndexedDB
 * This adapter mimics the Express server routes while using local IndexedDB.
 */

export interface StorageAdapterResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  json(): Promise<any>
  text(): Promise<string>
}

class LocalStorageAdapter {
  private mockUserId = 'user-123' // match the server's mock user ID

  private createResponse(data: any, status: number = 200, statusText = 'OK'): StorageAdapterResponse {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers,
      async json() { return data },
      async text() { return JSON.stringify(data) },
    }
  }

  private createErrorResponse(message: string, status: number = 500): StorageAdapterResponse {
    return this.createResponse({ error: message }, status, 'Error')
  }

  async handleRequest(method: string, url: string, data?: any): Promise<StorageAdapterResponse> {
    try {
      const urlParts = url.replace('/api/', '').split('/')
      const endpoint = urlParts[0]

      switch (endpoint) {
        case 'captures':        return this.handleCapturesRequest(method, urlParts, data)
        case 'buckets':         return this.handleBucketsRequest(method, urlParts, data)
        case 'folders':         return this.handleFoldersRequest(method, urlParts, data)
        case 'task-templates':  return this.handleTaskTemplatesRequest(method, urlParts, data)
        case 'reminders':       return this.handleRemindersRequest(method, urlParts, data)
        case 'upload':          return this.handleUploadRequest(method, data)
        default:                return this.createErrorResponse(`Unknown endpoint: ${endpoint}`, 404)
      }
    } catch (err: any) {
      console.error('Storage adapter error:', err)
      return this.createErrorResponse(err?.message || 'Internal server error', 500)
    }
  }

  // ------- Captures -------
  private async handleCapturesRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts
    switch (method) {
      case 'GET': {
        if (!p1) {
          const rows = await indexedDBService.getCapturesByUser(this.mockUserId)
          return this.createResponse(rows)
        }
        if (p1 === 'bucket' && p2) {
          const rows = await indexedDBService.getCapturesByBucket(p2)
          return this.createResponse(rows)
        }
        if (p1 === 'folder' && p2) {
          const rows = await indexedDBService.getCapturesByFolder(p2)
          return this.createResponse(rows)
        }
        const row = await indexedDBService.getCapture(p1)
        return row
          ? this.createResponse(row)
          : this.createErrorResponse('Capture not found', 404)
      }
      case 'POST': {
        if (!data) return this.createErrorResponse('Invalid capture data', 400)
        const payload = { ...data, userId: this.mockUserId }
        const row = await indexedDBService.createCapture(payload)
        return this.createResponse(row)
      }
      case 'PATCH': {
        if (!p1) return this.createErrorResponse('Capture ID required', 400)
        const row = await indexedDBService.updateCapture(p1, data)
        return row
          ? this.createResponse(row)
          : this.createErrorResponse('Capture not found', 404)
      }
      case 'DELETE': {
        if (!p1) return this.createErrorResponse('Capture ID required', 400)
        const ok = await indexedDBService.deleteCapture(p1)
        return ok ? this.createResponse({ success: true }) : this.createErrorResponse('Capture not found', 404)
      }
      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405)
    }
  }

  // ------- Buckets -------
  private async handleBucketsRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1] = parts
    switch (method) {
      case 'GET': {
        if (!p1) {
          const rows = await indexedDBService.getBucketsByUser(this.mockUserId)
          return this.createResponse(rows)
        }
        const row = await indexedDBService.getBucket(p1)
        return row ? this.createResponse(row) : this.createErrorResponse('Bucket not found', 404)
      }
      case 'POST': {
        if (p1 === 'reorder') {
          if (!data?.orderedIds) return this.createErrorResponse('Invalid reorder data', 400)
          try {
            const rows = await indexedDBService.reorderBuckets(this.mockUserId, data.orderedIds)
            return this.createResponse(rows)
          } catch (e: any) {
            if (String(e?.message || '').includes('Invalid bucket IDs')) {
              return this.createErrorResponse(e.message, 400)
            }
            throw e
          }
        }
        if (!data) return this.createErrorResponse('Invalid bucket data', 400)
        const payload = { ...data, userId: this.mockUserId }
        const row = await indexedDBService.createBucket(payload)
        return this.createResponse(row)
      }
      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405)
    }
  }

  // ------- Folders -------
  private async handleFoldersRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts
    switch (method) {
      case 'GET': {
        if (p1 === 'bucket' && p2) {
          const rows = await indexedDBService.getFoldersByBucket(p2)
          return this.createResponse(rows)
        }
        if (p1) {
          const row = await indexedDBService.getFolder(p1)
          return row ? this.createResponse(row) : this.createErrorResponse('Folder not found', 404)
        }
        return this.createErrorResponse('Invalid folder request', 400)
      }
      case 'POST': {
        if (!data) return this.createErrorResponse('Invalid folder data', 400)
        const row = await indexedDBService.createFolder(data)
        return this.createResponse(row)
      }
      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405)
    }
  }

  // ------- Task Templates -------
  private async handleTaskTemplatesRequest(method: string): Promise<StorageAdapterResponse> {
    switch (method) {
      case 'GET': {
        const rows = await indexedDBService.getTaskTemplates(this.mockUserId)
        return this.createResponse(rows)
      }
      case 'POST': {
        // Create a *custom* template (defaults are seeded once at app start)
        // Prevent creating another default
        const row = await indexedDBService.createTaskTemplate({
          userId: this.mockUserId,
          isDefault: false,
          name: '', // will be overwritten by indexedDB service validation if needed
          category: 'custom',
        } as any)
        return this.createResponse(row)
      }
      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405)
    }
  }

  // ------- Reminders -------
  private async handleRemindersRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts
    switch (method) {
      case 'GET': {
        if (p1 === 'due') {
          const before = data?.before ? new Date(data.before) : undefined
          const rows = await indexedDBService.getCapturesDue(this.mockUserId, before)
          return this.createResponse(rows)
        }
        const rows = await indexedDBService.getCapturesWithReminders(this.mockUserId)
        return this.createResponse(rows)
      }
      case 'POST': {
        if (p2 === 'notified') {
          if (!p1) return this.createErrorResponse('Capture ID required', 400)
          await indexedDBService.updateReminderNotified(p1)
          return this.createResponse({ success: true })
        }
        return this.createErrorResponse('Invalid reminder endpoint', 400)
      }
      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405)
    }
  }

  // ------- Upload -------
  private async handleUploadRequest(method: string, data?: any): Promise<StorageAdapterResponse> {
    if (method !== 'POST') return this.createErrorResponse(`Method ${method} not allowed`, 405)
    try {
      if (!data?.file) return this.createErrorResponse('No file uploaded', 400)
      const validation = await fileSystemService.validateFile(data.file)
      if (!validation.isValid) return this.createErrorResponse(validation.error || 'Invalid file', 400)
      const attachment = await fileSystemService.saveFile(
        data.file,
        validation.fileInfo?.name || 'unknown',
        validation.fileInfo?.type || 'application/octet-stream'
      )
      return this.createResponse(attachment)
    } catch (e) {
      console.error('File upload error:', e)
      return this.createErrorResponse('Failed to upload file', 500)
    }
  }
}

// Main adapter instance
export const storageAdapter = new LocalStorageAdapter()

// Should we use local storage or HTTP API?
export function shouldUseLocalStorage(): boolean {
  return getStorageMode() === 'local'
}

// Route to local adapter or HTTP fetch
export async function adaptedApiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  if (shouldUseLocalStorage()) {
    const resp = await storageAdapter.handleRequest(method, url, data)
    return new Response(JSON.stringify(await resp.json()), {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    })
  }

  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  })
  if (!res.ok) {
    const text = (await res.text()) || res.statusText
    throw new Error(`${res.status}: ${text}`)
  }
  return res
}

/**
 * Enhanced file upload handler that works with both environments
 */
export async function adaptedFileUpload(file: File): Promise<Attachment> {
  // Local mode: validate + save via filesystem service
  if (shouldUseLocalStorage()) {
    const validation = await fileSystemService.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }
    return fileSystemService.saveFile(file, file.name, file.type);
  }
  
const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(text);
  }

  return res.json() as Promise<Attachment>;
}
