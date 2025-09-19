import { indexedDBService } from './indexeddb';
import { fileSystemService } from './filesystem';
import { getStorageMode } from './capacitor';
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
} from '@shared/schema';

/**
 * Storage Adapter that provides HTTP API-compatible interface over IndexedDB.
 * This adapter mimics the Express server routes while using local IndexedDB.
 */

export interface StorageAdapterResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
}

class LocalStorageAdapter {
  private mockUserId = 'user-123'; // Match the server's mock user ID

  private createResponse(data: any, status: number = 200, statusText: string = 'OK'): StorageAdapterResponse {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers,
      async json() { return data; },
      async text() { return JSON.stringify(data); },
    };
  }

  private createErrorResponse(message: string, status: number = 500): StorageAdapterResponse {
    return this.createResponse({ error: message }, status, 'Error');
  }

  async handleRequest(method: string, url: string, data?: any): Promise<StorageAdapterResponse> {
    try {
      const urlParts = url.replace('/api/', '').split('/');
      const endpoint = urlParts[0];

      switch (endpoint) {
        case 'captures':        return this.handleCapturesRequest(method, urlParts, data);
        case 'buckets':         return this.handleBucketsRequest(method, urlParts, data);
        case 'folders':         return this.handleFoldersRequest(method, urlParts, data);
        case 'task-templates':  return this.handleTaskTemplatesRequest(method);
        case 'reminders':       return this.handleRemindersRequest(method, urlParts, data);
        case 'upload':          return this.handleUploadRequest(method, data);
        default:                return this.createErrorResponse(`Unknown endpoint: ${endpoint}`, 404);
      }
    } catch (error: any) {
      console.error('Storage adapter error:', error);
      return this.createErrorResponse(error?.message || 'Internal server error', 500);
    }
  }

  // -------- Captures --------
  private async handleCapturesRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts;

    switch (method) {
      case 'GET': {
        if (!p1) {
          const rows = await indexedDBService.getCapturesByUser(this.mockUserId);
          return this.createResponse(rows);
        }
        if (p1 === 'bucket' && p2) {
          const rows = await indexedDBService.getCapturesByBucket(p2);
          return this.createResponse(rows);
        }
        if (p1 === 'folder' && p2) {
          const rows = await indexedDBService.getCapturesByFolder(p2);
          return this.createResponse(rows);
        }
        const row = await indexedDBService.getCapture(p1);
        return row ? this.createResponse(row) : this.createErrorResponse('Capture not found', 404);
      }

      case 'POST': {
        if (!data) return this.createErrorResponse('Invalid capture data', 400);
        const payload = { ...data, userId: this.mockUserId } as InsertCapture;
        const row = await indexedDBService.createCapture(payload);
        return this.createResponse(row);
      }

      case 'PATCH': {
        if (!p1) return this.createErrorResponse('Capture ID required', 400);
        const row = await indexedDBService.updateCapture(p1, data as Partial<InsertCapture>);
        return row ? this.createResponse(row) : this.createErrorResponse('Capture not found', 404);
      }

      case 'DELETE': {
        if (!p1) return this.createErrorResponse('Capture ID required', 400);
        const ok = await indexedDBService.deleteCapture(p1);
        return ok ? this.createResponse({ success: true }) : this.createErrorResponse('Capture not found', 404);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Buckets --------
  private async handleBucketsRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1] = parts;

    switch (method) {
      case 'GET': {
        if (!p1) {
          const rows = await indexedDBService.getBucketsByUser(this.mockUserId);
          return this.createResponse(rows);
        }
        const row = await indexedDBService.getBucket(p1);
        return row ? this.createResponse(row) : this.createErrorResponse('Bucket not found', 404);
      }

      case 'POST': {
        if (p1 === 'reorder') {
          if (!data?.orderedIds) return this.createErrorResponse('Invalid reorder data', 400);
          try {
            const rows = await indexedDBService.reorderBuckets(this.mockUserId, data.orderedIds as string[]);
            return this.createResponse(rows);
          } catch (e: any) {
            const msg = String(e?.message || '');
            if (msg.includes('Invalid bucket IDs')) return this.createErrorResponse(msg, 400);
            throw e;
          }
        }
        if (!data) return this.createErrorResponse('Invalid bucket data', 400);
        const payload = { ...data, userId: this.mockUserId } as InsertBucket;
        const row = await indexedDBService.createBucket(payload);
        return this.createResponse(row);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Folders --------
  private async handleFoldersRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts;

    switch (method) {
      case 'GET': {
        if (p1 === 'bucket' && p2) {
          const rows = await indexedDBService.getFoldersByBucket(p2);
          return this.createResponse(rows);
        }
        if (p1) {
          const row = await indexedDBService.getFolder(p1);
          return row ? this.createResponse(row) : this.createErrorResponse('Folder not found', 404);
        }
        return this.createErrorResponse('Invalid folder request', 400);
      }

      case 'POST': {
        if (!data) return this.createErrorResponse('Invalid folder data', 400);
        const row = await indexedDBService.createFolder(data as InsertFolder);
        return this.createResponse(row);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Task Templates --------
  private async handleTaskTemplatesRequest(
  method: string,
  _parts?: string[],
  _data?: any
): Promise<StorageAdapterResponse> {
    switch (method) {
      case 'GET': {
        const rows = await indexedDBService.getTaskTemplates(this.mockUserId);
        return this.createResponse(rows);
      }

      case 'POST': {
        // Create a *custom* template (defaults are seeded once at app start)
        const row = await indexedDBService.createTaskTemplate({
          userId: this.mockUserId,
          isDefault: false,
          name: '',
          category: 'custom',
        } as InsertTaskTemplate);
        return this.createResponse(row);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Reminders --------
  private async handleRemindersRequest(method: string, parts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, p1, p2] = parts;

    switch (method) {
      case 'GET': {
        if (p1 === 'due') {
          const before = data?.before ? new Date(data.before) : undefined;
          const rows = await indexedDBService.getCapturesDue(this.mockUserId, before);
          return this.createResponse(rows);
        }
        const rows = await indexedDBService.getCapturesWithReminders(this.mockUserId);
        return this.createResponse(rows);
      }

      case 'POST': {
        if (p2 === 'notified') {
          if (!p1) return this.createErrorResponse('Capture ID required', 400);
          await indexedDBService.updateReminderNotified(p1);
          return this.createResponse({ success: true });
        }
        return this.createErrorResponse('Invalid reminder endpoint', 400);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Upload --------
  private async handleUploadRequest(method: string, data?: any): Promise<StorageAdapterResponse> {
    if (method !== 'POST') return this.createErrorResponse(`Method ${method} not allowed`, 405);

    try {
      if (!data?.file) return this.createErrorResponse('No file uploaded', 400);

      const validation = await fileSystemService.validateFile(data.file);
      if (!validation.isValid) return this.createErrorResponse(validation.error || 'Invalid file', 400);

      const attachment = await fileSystemService.saveFile(
        data.file,
        validation.fileInfo?.name || 'unknown',
        validation.fileInfo?.type || 'application/octet-stream'
      );

      return this.createResponse(attachment);
    } catch (error) {
      console.error('File upload error:', error);
      return this.createErrorResponse('Failed to upload file', 500);
    }
  }
}

/* ------------------------- Adapter & mode helpers ------------------------- */

export const storageAdapter = new LocalStorageAdapter();

/** Use local IndexedDB or HTTP API? */
export function shouldUseLocalStorage(): boolean {
  return getStorageMode() === 'local';
}

/* ---------------------- Robust API base & fetch helper -------------------- */

// Normalize a base URL (strip trailing slash).
function normalizeBase(u: string) {
  if (!u) return '';
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

/**
 * Accept several env names so CI / local differences don't break the app.
 * Priority:
 *   1) runtime (window.__API_BASE_URL__)
 *   2) VITE_API_BASE          ← what the GitHub Action sets
 *   3) VITE_API_BASE_URL
 *   4) VITE_APP_ORIGIN
 *   5) '' (relative; only useful in web dev)
 */
const API_BASE = normalizeBase(
  (globalThis as any).__API_BASE_URL__ ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_APP_ORIGIN ||
  'https://brain-bucket-kmkohl117.replit.app'   // <--- force default
);


// 🔎 Always log what base URL we resolved at runtime (APK & web)
console.log(
  `🌐 BrainBucket API_BASE = '${API_BASE || "(relative)"}'`,
  {
    from: (globalThis as any).__API_BASE_URL__ ? 'window.__API_BASE_URL__' : 'env',
    VITE_API_BASE: import.meta.env.VITE_API_BASE,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_APP_ORIGIN: import.meta.env.VITE_APP_ORIGIN,
  }
);


function httpFetch(path: string, init?: RequestInit) {
  const url = API_BASE
    ? `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
    : path; // fallback to relative (web dev only)

  // 🛰️ Trace all outgoing requests
  const m = (init?.method || 'GET').toUpperCase();
  console.log(`🛰️ [BB-NET] ${m} ${url}`);

  return fetch(url, init);
}

/* ---------------------------- HTTP request path --------------------------- */

/** Route requests either to local adapter or real HTTP API. */
export async function adaptedApiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  if (shouldUseLocalStorage()) {
    const response = await storageAdapter.handleRequest(method, url, data);
    return new Response(JSON.stringify(await response.json()), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  // HTTP mode → always go through httpFetch so the APK talks to your server
  const res = await httpFetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`🧨 [BB-NET] ${method} ${API_BASE ? `${API_BASE}${url}` : url} -> ${res.status} ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

/** Upload handler that works in both environments. */
export async function adaptedFileUpload(file: File): Promise<Attachment> {
  if (shouldUseLocalStorage()) {
    const validation = await fileSystemService.validateFile(file);
    if (!validation.isValid) throw new Error(validation.error || 'Invalid file');
    return fileSystemService.saveFile(file, file.name, file.type);
  }

  const form = new FormData();
  form.append('file', file);

  const res = await httpFetch('/api/upload', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`🧨 [BB-NET] POST ${API_BASE ? `${API_BASE}/api/upload` : '/api/upload'} -> ${res.status} ${text}`);
    throw new Error(`Upload failed: ${text}`);
  }
  return res.json() as Promise<Attachment>;
}

