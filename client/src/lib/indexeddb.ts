import { openDB, type IDBPDatabase } from 'idb';
import type { Capture, Bucket, Folder, TaskTemplate } from '@shared/schema';

interface BrainBucketDB {
  captures: {
    key: string;
    value: Capture;
    indexes: { bucketId: string; folderId: string; userId: string };
  };
  buckets: {
    key: string;
    value: Bucket;
    indexes: { userId: string };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: { bucketId: string };
  };
  taskTemplates: {
    key: string;
    value: TaskTemplate;
    indexes: { userId: string; category: string };
  };
}

class IndexedDBService {
  private db: IDBPDatabase<BrainBucketDB> | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<BrainBucketDB>('BrainBucketDB', 1, {
      upgrade(db) {
        // Captures store
        const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
        capturesStore.createIndex('bucketId', 'bucketId');
        capturesStore.createIndex('folderId', 'folderId');
        capturesStore.createIndex('userId', 'userId');

        // Buckets store
        const bucketsStore = db.createObjectStore('buckets', { keyPath: 'id' });
        bucketsStore.createIndex('userId', 'userId');

        // Folders store
        const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
        foldersStore.createIndex('bucketId', 'bucketId');

        // Task templates store
        const templatesStore = db.createObjectStore('taskTemplates', { keyPath: 'id' });
        templatesStore.createIndex('userId', 'userId');
        templatesStore.createIndex('category', 'category');
      },
    });

    return this.db;
  }

  // Captures
  async saveCapture(capture: Capture) {
    const db = await this.init();
    await db.put('captures', capture);
  }

  async getCaptures(userId: string): Promise<Capture[]> {
    const db = await this.init();
    return db.getAllFromIndex('captures', 'userId', userId);
  }

  async getCapturesByBucket(bucketId: string): Promise<Capture[]> {
    const db = await this.init();
    return db.getAllFromIndex('captures', 'bucketId', bucketId);
  }

  async getCapturesByFolder(folderId: string): Promise<Capture[]> {
    const db = await this.init();
    return db.getAllFromIndex('captures', 'folderId', folderId);
  }

  async getCapture(id: string): Promise<Capture | undefined> {
    const db = await this.init();
    return db.get('captures', id);
  }

  async deleteCapture(id: string) {
    const db = await this.init();
    await db.delete('captures', id);
  }

  // Buckets
  async saveBucket(bucket: Bucket) {
    const db = await this.init();
    await db.put('buckets', bucket);
  }

  async getBuckets(userId: string): Promise<Bucket[]> {
    const db = await this.init();
    return db.getAllFromIndex('buckets', 'userId', userId);
  }

  async getBucket(id: string): Promise<Bucket | undefined> {
    const db = await this.init();
    return db.get('buckets', id);
  }

  // Folders
  async saveFolder(folder: Folder) {
    const db = await this.init();
    await db.put('folders', folder);
  }

  async getFoldersByBucket(bucketId: string): Promise<Folder[]> {
    const db = await this.init();
    return db.getAllFromIndex('folders', 'bucketId', bucketId);
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const db = await this.init();
    return db.get('folders', id);
  }

  // Task Templates
  async saveTaskTemplate(template: TaskTemplate) {
    const db = await this.init();
    await db.put('taskTemplates', template);
  }

  async getTaskTemplates(userId?: string): Promise<TaskTemplate[]> {
    const db = await this.init();
    if (userId) {
      return db.getAllFromIndex('taskTemplates', 'userId', userId);
    }
    return db.getAll('taskTemplates');
  }

  // Sync with server
  async syncToServer() {
    // Implementation for syncing local changes to server
    // This would be called when online
  }

  async syncFromServer() {
    // Implementation for syncing server data to local
    // This would be called when coming back online
  }
}

export const indexedDBService = new IndexedDBService();
