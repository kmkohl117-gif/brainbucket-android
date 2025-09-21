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
 * Storage Adapter that provides HTTP API-compatible interface over IndexedDB
 * 
 * This adapter mimics the exact behavior of the Express server routes
 * while using local IndexedDB storage instead of HTTP requests.
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

  /**
   * Create a mock Response object that mimics fetch Response
   */
  private createResponse(data: any, status: number = 200, statusText: string = 'OK'): StorageAdapterResponse {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers,
      async json() {
        return data;
      },
      async text() {
        return JSON.stringify(data);
      },
    };
  }

  private createErrorResponse(message: string, status: number = 500): StorageAdapterResponse {
    return this.createResponse({ error: message }, status, 'Error');
  }

  /**
   * Route HTTP-like requests to IndexedDB operations
   */
  async handleRequest(method: string, url: string, data?: any): Promise<StorageAdapterResponse> {
    try {
      const urlParts = url.replace('/api/', '').split('/');
      const endpoint = urlParts[0];

      switch (endpoint) {
        case 'captures':
          return this.handleCapturesRequest(method, urlParts, data);

        case 'buckets':
          return this.handleBucketsRequest(method, urlParts, data);

        case 'folders':
          return this.handleFoldersRequest(method, urlParts, data);

        case 'task-templates':
          return this.handleTaskTemplatesRequest(method, urlParts, data);

        case 'reminders':
          return this.handleRemindersRequest(method, urlParts, data);

        case 'upload':
          return this.handleUploadRequest(method, data);

        default:
          return this.createErrorResponse(`Unknown endpoint: ${endpoint}`, 404);
      }
    } catch (error: any) {
      console.error('Storage adapter error:', error);
      return this.createErrorResponse(error?.message || 'Internal server error', 500);
    }
  }

  // -------- Captures --------
  private async handleCapturesRequest(method: string, urlParts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, param1, param2] = urlParts;

    switch (method) {
      case 'GET': {
        if (!param1) {
          // GET /api/captures
          const captures = await indexedDBService.getCapturesByUser(this.mockUserId);
          return this.createResponse(captures);
        }
        if (param1 === 'bucket' && param2) {
          // GET /api/captures/bucket/:bucketId
          const captures = await indexedDBService.getCapturesByBucket(param2);
          return this.createResponse(captures);
        }
        if (param1 === 'folder' && param2) {
          // GET /api/captures/folder/:folderId
          const captures = await indexedDBService.getCapturesByFolder(param2);
          return this.createResponse(captures);
        }
        // GET /api/captures/:id
        const capture = await indexedDBService.getCapture(param1);
        return capture ? this.createResponse(capture) : this.createErrorResponse('Capture not found', 404);
      }

      case 'POST': {
        // POST /api/captures
        if (!data) return this.createErrorResponse('Invalid capture data', 400);
        const captureData = { ...data, userId: this.mockUserId } as InsertCapture;
        const newCapture = await indexedDBService.createCapture(captureData);
        return this.createResponse(newCapture);
      }

      case 'PATCH': {
        // PATCH /api/captures/:id
        if (!param1) return this.createErrorResponse('Capture ID required', 400);
        const updated = await indexedDBService.updateCapture(param1, data as Partial<InsertCapture>);
        return updated ? this.createResponse(updated) : this.createErrorResponse('Capture not found', 404);
      }

      case 'DELETE': {
        // DELETE /api/captures/:id
        if (!param1) return this.createErrorResponse('Capture ID required', 400);
        const deleted = await indexedDBService.deleteCapture(param1);
        return deleted ? this.createResponse({ success: true }) : this.createErrorResponse('Capture not found', 404);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Buckets --------
  private async handleBucketsRequest(method: string, urlParts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, param1] = urlParts;

    switch (method) {
      case 'GET': {
        if (!param1) {
          // GET /api/buckets
          const buckets = await indexedDBService.getBucketsByUser(this.mockUserId);
          return this.createResponse(buckets);
        }
        // GET /api/buckets/:id
        const bucket = await indexedDBService.getBucket(param1);
        return bucket ? this.createResponse(bucket) : this.createErrorResponse('Bucket not found', 404);
      }

      case 'POST': {
        if (param1 === 'reorder') {
          // POST /api/buckets/reorder
          if (!data?.orderedIds) return this.createErrorResponse('Invalid reorder data', 400);
          try {
            const buckets = await indexedDBService.reorderBuckets(this.mockUserId, data.orderedIds as string[]);
            return this.createResponse(buckets);
          } catch (e: any) {
            const msg = String(e?.message || '');
            if (msg.includes('Invalid bucket IDs')) return this.createErrorResponse(msg, 400);
            throw e;
          }
        }

        // POST /api/buckets
        if (!data) return this.createErrorResponse('Invalid bucket data', 400);
        const bucketData = { ...data, userId: this.mockUserId } as InsertBucket;
        const newBucket = await indexedDBService.createBucket(bucketData);
        return this.createResponse(newBucket);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Folders --------
  private async handleFoldersRequest(method: string, urlParts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, param1, param2] = urlParts;

    switch (method) {
      case 'GET': {
        if (param1 === 'bucket' && param2) {
          // GET /api/folders/bucket/:bucketId
          const folders = await indexedDBService.getFoldersByBucket(param2);
          return this.createResponse(folders);
        }
        if (param1) {
          // GET /api/folders/:id
          const folder = await indexedDBService.getFolder(param1);
          return folder ? this.createResponse(folder) : this.createErrorResponse('Folder not found', 404);
        }
        return this.createErrorResponse('Invalid folder request', 400);
      }

      case 'POST': {
        // POST /api/folders
        if (!data) return this.createErrorResponse('Invalid folder data', 400);
        const newFolder = await indexedDBService.createFolder(data as InsertFolder);
        return this.createResponse(newFolder);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Task Templates --------
  private async handleTaskTemplatesRequest(method: string, urlParts: string[], data?: any): Promise<StorageAdapterResponse> {
    switch (method) {
      case 'GET': {
        // GET /api/task-templates
        const templates = await indexedDBService.getTaskTemplates(this.mockUserId);
        return this.createResponse(templates);
      }

      case 'POST': {
        // POST /api/task-templates
        // Create a *custom* template (defaults are seeded once at app start)
        const newTemplate = await indexedDBService.createTaskTemplate({
          userId: this.mockUserId,
          isDefault: false,
          name: '',
          category: 'custom',
        } as InsertTaskTemplate);
        return this.createResponse(newTemplate);
      }

      default:
        return this.createErrorResponse(`Method ${method} not allowed`, 405);
    }
  }

  // -------- Reminders --------
  private async handleRemindersRequest(method: string, urlParts: string[], data?: any): Promise<StorageAdapterResponse> {
    const [, param1, param2] = urlParts;

    switch (method) {
      case 'GET': {
        if (param1 === 'due') {
          // GET /api/reminders/due
          const beforeDate = data?.before ? new Date(data.before) : undefined;
          const due = await indexedDBService.getCapturesDue(this.mockUserId, beforeDate);
          return this.createResponse(due);
        }
        // GET /api/reminders
        const reminders = await indexedDBService.getCapturesWithReminders(this.mockUserId);
        return this.createResponse(reminders);
      }

      case 'POST': {
        if (param2 === 'notified') {
          // POST /api/reminders/:captureId/notified
          if (!param1) return this.createErrorResponse('Capture ID required', 400);
          await indexedDBService.updateReminderNotified(param1);
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

      // Validate file using filesystem service
      const validation = await fileSystemService.validateFile(data.file);
      if (!validation.isValid) return this.createErrorResponse(validation.error || 'Invalid file', 400);

      // Save file using filesystem service
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

/**
 * Main storage adapter instance
 */
export const storageAdapter = new LocalStorageAdapter();

/**
 * Determine if we should use local storage or HTTP API
 */
export function shouldUseLocalStorage(): boolean {
  return getStorageMode() === 'local';
}

/**
 * API base URL for HTTP mode - HARD-CODED to fix localhost issue
 */
const API_BASE = 'https://brain-bucket-kmkohl117.replit.app';

/**
 * Wrapper function that ALWAYS uses HTTP API (bypasses storage mode detection)
 */
export async function adaptedApiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  // FORCE HTTP MODE - bypass shouldUseLocalStorage() completely
  console.log(`FORCE HTTP MODE: storage mode would be '${getStorageMode()}' but using HTTP anyway`);
  
  // Use HTTP API with absolute URL for Capacitor compatibility
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  console.log(`Making HTTP request: ${method} ${fullUrl}`);
  console.log(`API_BASE is: "${API_BASE}"`);

  const res = await fetch(fullUrl, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  console.log(`HTTP response: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`HTTP request failed: ${res.status} ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

/**
 * Enhanced file upload handler that ALWAYS uses HTTP
 */
export async function adaptedFileUpload(file: File): Promise<Attachment> {
  // FORCE HTTP MODE - bypass shouldUseLocalStorage() completely
  console.log('FORCE HTTP MODE: file upload using HTTP endpoint');
  
  // HTTP upload endpoint with base URL
  const fullUrl = `${API_BASE}/api/upload`;
  console.log(`Upload URL: ${fullUrl}`);
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(fullUrl, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  return response.json() as Promise<Attachment>;
}