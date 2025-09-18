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
 * while mimicking the Express server’s JSON responses. It lets the app run
 * either fully local (“local” mode) or against the HTTP API (“api” mode).
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
  private mockUserId = 'user-123'; // same as server

  /** Create a fetch-like response */
  private createResponse(
    data: any,
    status: number = 200,
    statusText: string = 'OK',
  ): StorageAdapterResponse {
    const headers = new Headers({ 'Content-Type': 'application/json' });
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

  private createErrorResponse(message: string, status: number = 500) {
    return this.createResponse({ error: message }, status, 'Error');
  }

  /** Route HTTP-like requests to IndexedDB operations */
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
    } catch (err: any) {
      console.error('Storage adapter error:', err);
      return this.createErrorResponse(err?.message || 'Internal server error', 500);
    }
  }

  // ---------- Captures ----------
  private async handleCapturesRequest(
    method: string,
    urlParts: string[],
    data?: any,
  ): Promise<StorageAdapterResponse> {
    const [, param1, param2] = urlParts;

    if (method === 'GET') {
      if (!param1) {
        const captures = await indexedDBService.getCapturesByUser(this.mockUserId);
        return this.createResponse(captures);
      }
      if (param1 === 'bucket' && param2) {
        const captures = await indexedDBService.getCapturesByBucket(param2);
        return this.createResponse(captures);
      }
      if (param1 === 'folder' && param2) {
        const captures = await indexedDBService.getCapturesByFolder(param2);
        return this.createResponse(captures);
      }
      const capture = await indexedDBService.getCapture(param1);
      if (!capture) return this.createErrorResponse('Capture not found', 404);
      return this.createResponse(capture);
    }

    if (method === 'POST') {
      if (!data) return this.createErrorResponse('Invalid capture data', 400);
      const captureData = { ...data, userId: this.mockUserId };
      const newCapture = await indexedDBService.createCapture(captureData as InsertCapture);
      return this.createResponse(newCapture);
    }

    if (method === 'PATCH') {
      if (!param1) return this.createErrorResponse('Capture ID required', 400);
      const updated = await indexedDBService.updateCapture(param1, data);
      if (!updated) return this.createErrorResponse('Capture not found', 404);
      return this.createResponse(updated);
    }

    if (method === 'DELETE') {
      if (!param1) return this.createErrorResponse('Capture ID required', 400);
      const deleted = await indexedDBService.deleteCapture(param1);
      if (!deleted) return this.createErrorResponse('Capture not found', 404);
      return this.createResponse({ success: true });
    }

    return this.createErrorResponse(`Method ${method} not allowed`, 405);
  }

  // ---------- Buckets ----------
  private async handleBucketsRequest(
    method: string,
    urlParts: string[],
    data?: any,
  ): Promise<StorageAdapterResponse> {
    const [, param1] = urlParts;

    if (method === 'GET') {
      if (!param1) {
        const buckets = await indexedDBService.getBucketsByUser(this.mockUserId);
        return this.createResponse(buckets);
      }
      const bucket = await indexedDBService.getBucket(param1);
      if (!bucket) return this.createErrorResponse('Bucket not found', 404);
      return this.createResponse(bucket);
    }

    if (method === 'POST') {
      if (param1 === 'reorder') {
        if (!data?.orderedIds) return this.createErrorResponse('Invalid reorder data', 400);
        try {
          const buckets = await indexedDBService.reorderBuckets(this.mockUserId, data.orderedIds);
          return this.createResponse(buckets);
        } catch (err: any) {
          if (String(err?.message || '').includes('Invalid bucket IDs')) {
            return this.createErrorResponse(err.message, 400);
          }
          throw err;
        }
      }

      if (!data) return this.createErrorResponse('Invalid bucket data', 400);
      const bucketData = { ...data, userId: this.mockUserId } as InsertBucket;
      const newBucket = await indexedDBService.createBucket(bucketData);
      return this.createResponse(newBucket);
    }

    return this.createErrorResponse(`Method ${method} not allowed`, 405);
  }

  // ---------- Folders ----------
  private async handleFoldersRequest(
    method: string,
    urlParts: string[],
    data?: any,
  ): Promise<StorageAdapterResponse> {
    const [, param1, param2] = urlParts;

    if (method === 'GET') {
      if (param1 === 'bucket' && param2) {
        const folders = await indexedDBService.getFoldersByBucket(param2);
        return this.createResponse(folders);
      }
      if (param1) {
        const folder = await indexedDBService.getFolder(param1);
        if (!folder) return this.createErrorResponse('Folder not found', 404);
        return this.createResponse(folder);
      }
      return this.createErrorResponse('Invalid folder request', 400);
    }

    if (method === 'POST') {
      if (!data) return this.createErrorResponse('Invalid folder data', 400);
      const newFolder = await indexedDBService.createFolder(data as InsertFolder);
      return this.createResponse(newFolder);
    }

    return this.createErrorResponse(`Method ${method} not allowed`, 405);
  }

  // ---------- Task templates ----------
  private async handleTaskTemplatesRequest(
    method: string,
    _urlParts: string[],
    data?: any,
  ): Promise<StorageAdapterResponse> {
    if (method === 'GET') {
      const templates = await indexedDBService.getTaskTemplates(this.mockUserId);
      return this.createResponse(templates);
    }

    if (method === 'POST') {
      if (!data) return this.createErrorResponse('Invalid template data', 400);
      const templateData = { ...data, userId: this.mockUserId } as InsertTaskTemplate;
      const newTemplate = await indexedDBService.createTaskTemplate(templateData);
      return this.createResponse(newTemplate);
    }

    return this.createErrorResponse(`Method ${method} not allowed`, 405);
  }

  // ---------- Reminders ----------
  private async handleRemindersRequest(
    method: string,
    urlParts: string[],
    data?: any,
  ): Promise<StorageAdapterResponse> {
    const [, param1, param2] = urlParts;

    if (method === 'GET') {
      if (param1 === 'due') {
        const beforeDate = data?.before ? new Date(data.before) : undefined;
        const due = await indexedDBService.getCapturesDue(this.mockUserId, beforeDate);
        return this.createResponse(due);
      }
      const reminders = await indexedDBService.getCapturesWithReminders(this.mockUserId);
      return this.createResponse(reminders);
    }

    if (method === 'POST' && param2 === 'notified') {
      if (!param1) return this.createErrorResponse('Capture ID required', 400);
      await indexedDBService.updateReminderNotified(param1);
      return this.createResponse({ success: true });
    }

    return this.createErrorResponse(`Method ${method} not allowed`, 405);
  }

  // ---------- Upload ----------
  private async handleUploadRequest(method: string, data?: any): Promise<StorageAdapterResponse> {
    if (method !== 'POST') return this.createErrorResponse(`Method ${method} not allowed`, 405);
    try {
      if (!data?.file) return this.createErrorResponse('No file uploaded', 400);

      const validation = await fileSystemService.validateFile(data.file);
      if (!validation.isValid) {
        return this.createErrorResponse(validation.error || 'Invalid file', 400);
      }

      const attachment = await fileSystemService.saveFile(
        data.file,
        validation.fileInfo?.name || 'unknown',
        validation.fileInfo?.type || 'application/octet-stream',
      );

      return this.createResponse(attachment);
    } catch (err) {
      console.error('File upload error:', err);
      return this.createErrorResponse('Failed to upload file', 500);
    }
  }
}

/** Main storage adapter instance (used when in local mode) */
export const storageAdapter = new LocalStorageAdapter();

/** Should we use local storage or hit the HTTP API? */
export function shouldUseLocalStorage(): boolean {
  return getStorageMode() === 'local';
}

/** Unified request wrapper used by the app */
export async function adaptedApiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  if (shouldUseLocalStorage()) {
    const r = await storageAdapter.handleRequest(method, url, data);
    return new Response(JSON.stringify(await r.json()), {
      status: r.status,
      statusText: r.statusText,
      headers: r.headers,
    });
  }

  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

/** File upload that works in both modes */
export async function adaptedFileUpload(file: File): Promise<Attachment> {
  if (shouldUseLocalStorage()) {
    const validation = await fileSystemService.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }
    return fileSystemService.saveFile(file, file.name, file.type);
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
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
