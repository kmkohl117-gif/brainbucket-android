import { openDB, type IDBPDatabase } from 'idb';
import type { Capture, Bucket, Folder, TaskTemplate, User, InsertCapture, InsertBucket, InsertFolder, InsertTaskTemplate, InsertUser, Attachment } from '@shared/schema';

// Use Web Crypto API if crypto module is not available (browser environment)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface BrainBucketDB {
  users: {
    key: string;
    value: User;
    indexes: { username: string };
  };
  captures: {
    key: string;
    value: Capture;
    indexes: { bucketId: string; folderId: string; userId: string; reminderAt: string; isCompleted: string };
  };
  buckets: {
    key: string;
    value: Bucket;
    indexes: { userId: string; order: number };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: { bucketId: string; order: number };
  };
  taskTemplates: {
    key: string;
    value: TaskTemplate;
    indexes: { userId: string; category: string; isDefault: string };
  };
}

export class IndexedDBService {
  private db: IDBPDatabase<BrainBucketDB> | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<BrainBucketDB>('BrainBucketDB', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('username', 'username', { unique: true });
        }

        // Captures store  
        if (!db.objectStoreNames.contains('captures')) {
          const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
          capturesStore.createIndex('bucketId', 'bucketId');
          capturesStore.createIndex('folderId', 'folderId');
          capturesStore.createIndex('userId', 'userId');
          capturesStore.createIndex('reminderAt', 'reminderAt');
          capturesStore.createIndex('isCompleted', 'isCompleted');
        } else {
          // Add new indexes for existing captures store if upgrading
          const capturesStore = transaction.objectStore('captures');
          if (!capturesStore.indexNames.contains('reminderAt')) {
            capturesStore.createIndex('reminderAt', 'reminderAt');
          }
          if (!capturesStore.indexNames.contains('isCompleted')) {
            capturesStore.createIndex('isCompleted', 'isCompleted');
          }
        }

        // Buckets store
        if (!db.objectStoreNames.contains('buckets')) {
          const bucketsStore = db.createObjectStore('buckets', { keyPath: 'id' });
          bucketsStore.createIndex('userId', 'userId');
          bucketsStore.createIndex('order', 'order');
        } else {
          // Add order index if upgrading
          const bucketsStore = transaction.objectStore('buckets');
          if (!bucketsStore.indexNames.contains('order')) {
            bucketsStore.createIndex('order', 'order');
          }
        }

        // Folders store
        if (!db.objectStoreNames.contains('folders')) {
          const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
          foldersStore.createIndex('bucketId', 'bucketId');
          foldersStore.createIndex('order', 'order');
        } else {
          // Add order index if upgrading
          const foldersStore = transaction.objectStore('folders');
          if (!foldersStore.indexNames.contains('order')) {
            foldersStore.createIndex('order', 'order');
          }
        }

        // Task templates store
        if (!db.objectStoreNames.contains('taskTemplates')) {
          const templatesStore = db.createObjectStore('taskTemplates', { keyPath: 'id' });
          templatesStore.createIndex('userId', 'userId');
          templatesStore.createIndex('category', 'category');
          templatesStore.createIndex('isDefault', 'isDefault');
        } else {
          // Add isDefault index if upgrading
          const templatesStore = transaction.objectStore('taskTemplates');
          if (!templatesStore.indexNames.contains('isDefault')) {
            templatesStore.createIndex('isDefault', 'isDefault');
          }
        }
      },
    });

    // Initialize with default data if first time
    await this.initializeDefaultData();

    return this.db;
  }

  private async initializeDefaultData() {
    const db = await this.init();
    
    // Check if we already have users
    const userCount = await db.count('users');
    if (userCount > 0) return; // Already initialized

    // Create default user
    const mockUserId = "user-123";
    const mockUser: User = {
      id: mockUserId,
      username: "demo_user",
      password: "demo_password", 
      biometricEnabled: false,
      createdAt: new Date(),
    };
    await db.put('users', mockUser);

    // Create default cleaning task templates
    const cleaningTasks = [
      'Dishes', 'Trash', 'Water Plants', 'Vacuum', 'Clean Bathroom',
      'Hang Laundry', 'Change Sheets', 'Clean Shower', 'Wash Floors',
      'Clean Car', 'Tidy Bedroom', 'Replace Towels'
    ];

    for (const taskName of cleaningTasks) {
      const template: TaskTemplate = {
        id: generateId(),
        name: taskName,
        category: 'cleaning',
        userId: null,
        isDefault: true,
        createdAt: new Date(),
      };
      await db.put('taskTemplates', template);
    }

    // Create default buckets
    const defaultBuckets = [
      { name: 'To-Dos', color: 'hsl(200, 80%, 60%)', icon: 'fas fa-check-square', order: 0 },
      { name: 'Creatives', color: 'hsl(280, 60%, 70%)', icon: 'fas fa-palette', order: 1 },
      { name: 'Shopping Lists', color: 'hsl(30, 80%, 65%)', icon: 'fas fa-shopping-cart', order: 2 },
      { name: 'Ideas & Dreams', color: 'hsl(160, 70%, 70%)', icon: 'fas fa-lightbulb', order: 3 },
      { name: 'Vault', color: 'hsl(40, 70%, 75%)', icon: 'fas fa-lock', order: 4 },
      { name: 'Health', color: 'hsl(340, 60%, 75%)', icon: 'fas fa-heart', order: 5 }
    ];

    for (const bucketData of defaultBuckets) {
      const bucket: Bucket = {
        ...bucketData,
        id: generateId(),
        userId: mockUserId,
        isDefault: true,
        createdAt: new Date()
      };
      await db.put('buckets', bucket);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const db = await this.init();
    return db.get('users', id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.init();
    return db.getFromIndex('users', 'username', username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.init();
    const id = generateId();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      biometricEnabled: insertUser.biometricEnabled || false 
    };
    await db.put('users', user);

    // Create default buckets for new user
    await this.createDefaultBuckets(id);

    return user;
  }

  private async createDefaultBuckets(userId: string) {
    const defaultBuckets = [
      { name: 'To-Dos', color: 'hsl(200, 80%, 60%)', icon: 'fas fa-check-square', order: 0 },
      { name: 'Creatives', color: 'hsl(280, 60%, 70%)', icon: 'fas fa-palette', order: 1 },
      { name: 'Shopping Lists', color: 'hsl(30, 80%, 65%)', icon: 'fas fa-shopping-cart', order: 2 },
      { name: 'Ideas & Dreams', color: 'hsl(160, 70%, 70%)', icon: 'fas fa-lightbulb', order: 3 },
      { name: 'Vault', color: 'hsl(40, 70%, 75%)', icon: 'fas fa-lock', order: 4 },
      { name: 'Health', color: 'hsl(340, 60%, 75%)', icon: 'fas fa-heart', order: 5 }
    ];

    for (const bucket of defaultBuckets) {
      await this.createBucket({
        ...bucket,
        userId,
        isDefault: true
      });
    }
  }

  // Buckets
  async getBucketsByUser(userId: string): Promise<Bucket[]> {
    const db = await this.init();
    const buckets = await db.getAllFromIndex('buckets', 'userId', userId);
    return buckets.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getBucket(id: string): Promise<Bucket | undefined> {
    const db = await this.init();
    return db.get('buckets', id);
  }

  async createBucket(insertBucket: InsertBucket): Promise<Bucket> {
    const db = await this.init();
    const id = generateId();
    const bucket: Bucket = { 
      ...insertBucket, 
      id, 
      createdAt: new Date(),
      isDefault: insertBucket.isDefault || false,
      order: insertBucket.order || 0
    };
    await db.put('buckets', bucket);
    return bucket;
  }

  async updateBucket(id: string, updateData: Partial<InsertBucket>): Promise<Bucket | undefined> {
    const db = await this.init();
    const bucket = await db.get('buckets', id);
    if (!bucket) return undefined;

    const updated = { ...bucket, ...updateData };
    await db.put('buckets', updated);
    return updated;
  }

  async deleteBucket(id: string): Promise<boolean> {
    const db = await this.init();
    try {
      await db.delete('buckets', id);
      return true;
    } catch (error) {
      return false;
    }
  }

  async reorderBuckets(userId: string, orderedIds: string[]): Promise<Bucket[]> {
    const db = await this.init();
    
    // Get all user's buckets to validate the ordered IDs
    const userBuckets = await this.getBucketsByUser(userId);
    const validBucketIds = new Set(userBuckets.map(b => b.id));

    // Validate that all provided IDs belong to this user
    const invalidIds = orderedIds.filter(id => !validBucketIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid bucket IDs: ${invalidIds.join(', ')}`);
    }

    // Update the order field for each bucket based on its position in orderedIds
    const tx = db.transaction('buckets', 'readwrite');
    for (let index = 0; index < orderedIds.length; index++) {
      const bucketId = orderedIds[index];
      const bucket = await tx.store.get(bucketId);
      if (bucket && bucket.userId === userId) {
        const updated = { ...bucket, order: index };
        await tx.store.put(updated);
      }
    }
    await tx.done;

    // Return the updated buckets in their new order
    return this.getBucketsByUser(userId);
  }

  // Folders
  async getFoldersByBucket(bucketId: string): Promise<Folder[]> {
    const db = await this.init();
    const folders = await db.getAllFromIndex('folders', 'bucketId', bucketId);
    return folders.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const db = await this.init();
    return db.get('folders', id);
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const db = await this.init();
    const id = generateId();
    const folder: Folder = { 
      ...insertFolder, 
      id, 
      createdAt: new Date(),
      order: insertFolder.order || 0
    };
    await db.put('folders', folder);
    return folder;
  }

  async updateFolder(id: string, updateData: Partial<InsertFolder>): Promise<Folder | undefined> {
    const db = await this.init();
    const folder = await db.get('folders', id);
    if (!folder) return undefined;

    const updated = { ...folder, ...updateData };
    await db.put('folders', updated);
    return updated;
  }

  async deleteFolder(id: string): Promise<boolean> {
    const db = await this.init();
    try {
      await db.delete('folders', id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Captures
  async getCapturesByUser(userId: string): Promise<Capture[]> {
    const db = await this.init();
    const captures = await db.getAllFromIndex('captures', 'userId', userId);
    return captures.sort((a, b) => {
      // Starred items first, then by creation date
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });
  }

  async getCapturesByBucket(bucketId: string): Promise<Capture[]> {
    const db = await this.init();
    const captures = await db.getAllFromIndex('captures', 'bucketId', bucketId);
    return captures.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }

  async getCapturesByFolder(folderId: string): Promise<Capture[]> {
    const db = await this.init();
    const captures = await db.getAllFromIndex('captures', 'folderId', folderId);
    return captures.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }

  async getCapture(id: string): Promise<Capture | undefined> {
    const db = await this.init();
    return db.get('captures', id);
  }

  async createCapture(insertCapture: InsertCapture): Promise<Capture> {
    const db = await this.init();
    const id = generateId();
    const capture: Capture = { 
      ...insertCapture, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      description: insertCapture.description ?? null,
      folderId: insertCapture.folderId ?? null,
      isStarred: insertCapture.isStarred || false,
      isCompleted: insertCapture.isCompleted || false,
      order: insertCapture.order || 0,
      attachments: (insertCapture.attachments as Attachment[]) || []
    };
    await db.put('captures', capture);
    return capture;
  }

  async updateCapture(id: string, updateData: Partial<InsertCapture>): Promise<Capture | undefined> {
    const db = await this.init();
    const capture = await db.get('captures', id);
    if (!capture) return undefined;

    const updated: Capture = { 
      ...capture, 
      ...updateData, 
      description: updateData.description !== undefined ? updateData.description ?? null : capture.description,
      attachments: updateData.attachments ? (updateData.attachments as Attachment[]) : capture.attachments,
      updatedAt: new Date() 
    };
    await db.put('captures', updated);
    return updated;
  }

  async deleteCapture(id: string): Promise<boolean> {
    const db = await this.init();
    try {
      await db.delete('captures', id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Task Templates
  async getTaskTemplates(userId?: string): Promise<TaskTemplate[]> {
    const db = await this.init();
    const allTemplates = await db.getAll('taskTemplates');
    return allTemplates.filter(template => template.isDefault || template.userId === userId);
  }

  async createTaskTemplate(insertTemplate: InsertTaskTemplate): Promise<TaskTemplate> {
    const db = await this.init();
    const id = generateId();
    const template: TaskTemplate = { 
      ...insertTemplate, 
      id, 
      createdAt: new Date(),
      isDefault: insertTemplate.isDefault || false,
      userId: insertTemplate.userId || null
    };
    await db.put('taskTemplates', template);
    return template;
  }

  async deleteTaskTemplate(id: string): Promise<boolean> {
    const db = await this.init();
    const template = await db.get('taskTemplates', id);
    if (template && template.isDefault) return false; // Can't delete default templates
    
    try {
      await db.delete('taskTemplates', id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Reminders
  async getCapturesWithReminders(userId: string): Promise<Capture[]> {
    const db = await this.init();
    const allCaptures = await db.getAllFromIndex('captures', 'userId', userId);
    const now = new Date();
    
    return allCaptures
      .filter(capture => 
        capture.reminderAt && 
        capture.reminderAt > now &&
        (!capture.snoozedUntil || capture.snoozedUntil <= now) &&
        !capture.isCompleted
      )
      .sort((a, b) => {
        const aTime = a.reminderAt?.getTime() || 0;
        const bTime = b.reminderAt?.getTime() || 0;
        return aTime - bTime;
      });
  }

  async getCapturesDue(userId: string, beforeDate?: Date): Promise<Capture[]> {
    const db = await this.init();
    const allCaptures = await db.getAllFromIndex('captures', 'userId', userId);
    const cutoff = beforeDate || new Date();
    
    return allCaptures
      .filter(capture => 
        capture.reminderAt && 
        capture.reminderAt <= cutoff &&
        (!capture.snoozedUntil || capture.snoozedUntil <= cutoff) &&
        !capture.isCompleted
      )
      .sort((a, b) => {
        const aTime = a.reminderAt?.getTime() || 0;
        const bTime = b.reminderAt?.getTime() || 0;
        return aTime - bTime;
      });
  }

  async updateReminderNotified(captureId: string): Promise<void> {
    const db = await this.init();
    const capture = await db.get('captures', captureId);
    if (capture) {
      const updated = { ...capture, lastNotifiedAt: new Date() };
      await db.put('captures', updated);
    }
  }

  // Legacy methods for backward compatibility
  async saveCapture(capture: Capture) {
    const db = await this.init();
    await db.put('captures', capture);
  }

  async getCaptures(userId: string): Promise<Capture[]> {
    return this.getCapturesByUser(userId);
  }

  async saveBucket(bucket: Bucket) {
    const db = await this.init();
    await db.put('buckets', bucket);
  }

  async getBuckets(userId: string): Promise<Bucket[]> {
    return this.getBucketsByUser(userId);
  }

  async saveFolder(folder: Folder) {
    const db = await this.init();
    await db.put('folders', folder);
  }

  async saveTaskTemplate(template: TaskTemplate) {
    const db = await this.init();
    await db.put('taskTemplates', template);
  }

  // Sync methods (placeholder for server sync)
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