import {
  type User,
  type InsertUser,
  type Bucket,
  type InsertBucket,
  type Folder,
  type InsertFolder,
  type Capture,
  type InsertCapture,
  type TaskTemplate,
  type InsertTaskTemplate,
  type Attachment,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Buckets
  getBucketsByUser(userId: string): Promise<Bucket[]>;
  getBucket(id: string): Promise<Bucket | undefined>;
  createBucket(bucket: InsertBucket): Promise<Bucket>;
  updateBucket(id: string, bucket: Partial<InsertBucket>): Promise<Bucket | undefined>;
  deleteBucket(id: string): Promise<boolean>;
  reorderBuckets(userId: string, orderedIds: string[]): Promise<Bucket[]>;

  // Folders
  getFoldersByBucket(bucketId: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: string, folder: Partial<InsertFolder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<boolean>;

  // Captures
  getCapturesByUser(userId: string): Promise<Capture[]>;
  getCapturesByBucket(bucketId: string): Promise<Capture[]>;
  getCapturesByFolder(folderId: string): Promise<Capture[]>;
  getCapture(id: string): Promise<Capture | undefined>;
  createCapture(capture: InsertCapture): Promise<Capture>;
  updateCapture(id: string, capture: Partial<InsertCapture>): Promise<Capture | undefined>;
  deleteCapture(id: string): Promise<boolean>;

  // Task Templates
  getTaskTemplates(userId?: string): Promise<TaskTemplate[]>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  deleteTaskTemplate(id: string): Promise<boolean>;

  // Reminders
  getCapturesWithReminders(userId: string): Promise<Capture[]>;
  getCapturesDue(userId: string, beforeDate?: Date): Promise<Capture[]>;
  updateReminderNotified(captureId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private buckets: Map<string, Bucket> = new Map();
  private folders: Map<string, Folder> = new Map();
  private captures: Map<string, Capture> = new Map();
  private taskTemplates: Map<string, TaskTemplate> = new Map();

  private initialized = false;

  constructor() {
    this.initializeDefaultData();
  }

  /** Seed defaults once; idempotent across hot reloads. */
  private async initializeDefaultData() {
    if (this.initialized) return;

    // --- default cleaning task templates (idempotent) ---
    const cleaningTasks = [
      "Dishes",
      "Trash",
      "Water Plants",
      "Vacuum",
      "Clean Bathroom",
      "Hang Laundry",
      "Change Sheets",
      "Clean Shower",
      "Wash Floors",
      "Clean Car",
      "Tidy Bedroom",
      "Replace Towels",
    ];

    for (const name of cleaningTasks) {
      const exists = Array.from(this.taskTemplates.values()).some(
        (t) => t.isDefault && t.category === "cleaning" && t.name === name
      );
      if (exists) continue;

      const template: TaskTemplate = {
        id: randomUUID(),
        name,
        category: "cleaning",
        userId: null,
        isDefault: true,
        createdAt: new Date(),
      };
      this.taskTemplates.set(template.id, template);
    }

    // Mock user (idempotent)
    const mockUserId = "user-123";
    if (!this.users.has(mockUserId)) {
      const mockUser: User = {
        id: mockUserId,
        username: "demo_user",
        password: "demo_password",
        biometricEnabled: false,
        createdAt: new Date(),
      };
      this.users.set(mockUserId, mockUser);
    }

    // Default buckets (idempotent)
    await this.createDefaultBuckets(mockUserId);

    this.initialized = true;
  }

  /** Create default buckets only if each one doesn't already exist. */
  private async createDefaultBuckets(userId: string) {
    const defaults: Array<
      Pick<InsertBucket, "name" | "icon" | "order"> & { color: string }
    > = [
      { name: "To-Dos",          color: "hsl(200, 80%, 60%)", icon: "fas fa-check-square", order: 0 },
      { name: "Creatives",       color: "hsl(280, 60%, 70%)", icon: "fas fa-palette",       order: 1 },
      { name: "Shopping Lists",  color: "hsl(30, 80%, 65%)",  icon: "fas fa-shopping-cart", order: 2 },
      { name: "Ideas & Dreams",  color: "hsl(160, 70%, 70%)", icon: "fas fa-lightbulb",     order: 3 },
      { name: "Vault",           color: "hsl(40, 70%, 75%)",  icon: "fas fa-lock",          order: 4 },
      { name: "Health",          color: "hsl(340, 60%, 75%)", icon: "fas fa-heart",         order: 5 },
    ];

    for (const b of defaults) {
      const exists = Array.from(this.buckets.values()).some(
        (x) => x.userId === userId && x.isDefault && x.name === b.name
      );
      if (exists) continue;

      await this.createBucket({
        name: b.name,
        color: b.color,
        icon: b.icon,
        order: b.order,
        userId,
        isDefault: true,
      });
    }
  }

  // ----------------- Buckets -----------------

  async getBucketsByUser(userId: string): Promise<Bucket[]> {
    return Array.from(this.buckets.values())
      .filter((bucket) => bucket.userId === userId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getBucket(id: string): Promise<Bucket | undefined> {
    return this.buckets.get(id);
  }

  async createBucket(insertBucket: InsertBucket): Promise<Bucket> {
    const id = randomUUID();
    const bucket: Bucket = {
      ...insertBucket,
      id,
      createdAt: new Date(),
      isDefault: insertBucket.isDefault ?? false,
      order: insertBucket.order ?? 0,
    };
    this.buckets.set(id, bucket);
    return bucket;
  }

  async updateBucket(id: string, updateData: Partial<InsertBucket>): Promise<Bucket | undefined> {
    const bucket = this.buckets.get(id);
    if (!bucket) return undefined;

    const updated = { ...bucket, ...updateData };
    this.buckets.set(id, updated);
    return updated;
  }

  async deleteBucket(id: string): Promise<boolean> {
    return this.buckets.delete(id);
  }

  async reorderBuckets(userId: string, orderedIds: string[]): Promise<Bucket[]> {
    const userBuckets = await this.getBucketsByUser(userId);
    const validBucketIds = new Set(userBuckets.map((b) => b.id));

    const invalidIds = orderedIds.filter((id) => !validBucketIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid bucket IDs: ${invalidIds.join(", ")}`);
    }

    orderedIds.forEach((bucketId, index) => {
      const bucket = this.buckets.get(bucketId);
      if (bucket && bucket.userId === userId) {
        this.buckets.set(bucketId, { ...bucket, order: index });
      }
    });

    return this.getBucketsByUser(userId);
  }

  // ----------------- Folders -----------------

  async getFoldersByBucket(bucketId: string): Promise<Folder[]> {
    return Array.from(this.folders.values())
      .filter((folder) => folder.bucketId === bucketId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const id = randomUUID();
    const folder: Folder = {
      ...insertFolder,
      id,
      createdAt: new Date(),
      order: insertFolder.order ?? 0,
    };
    this.folders.set(id, folder);
    return folder;
  }

  async updateFolder(id: string, updateData: Partial<InsertFolder>): Promise<Folder | undefined> {
    const folder = this.folders.get(id);
    if (!folder) return undefined;

    const updated = { ...folder, ...updateData };
    this.folders.set(id, updated);
    return updated;
  }

  async deleteFolder(id: string): Promise<boolean> {
    return this.folders.delete(id);
  }

  // ----------------- Captures -----------------

  async getCapturesByUser(userId: string): Promise<Capture[]> {
    return Array.from(this.captures.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });
  }

  async getCapturesByBucket(bucketId: string): Promise<Capture[]> {
    return Array.from(this.captures.values())
      .filter((c) => c.bucketId === bucketId)
      .sort((a, b) => {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }

  async getCapturesByFolder(folderId: string): Promise<Capture[]> {
    return Array.from(this.captures.values())
      .filter((c) => c.folderId === folderId)
      .sort((a, b) => {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }

  async getCapture(id: string): Promise<Capture | undefined> {
    return this.captures.get(id);
  }

  async createCapture(insertCapture: InsertCapture): Promise<Capture> {
    const id = randomUUID();
    const capture: Capture = {
      ...insertCapture,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: insertCapture.description ?? null,
      folderId: insertCapture.folderId ?? null,
      isStarred: insertCapture.isStarred ?? false,
      isCompleted: insertCapture.isCompleted ?? false,
      order: insertCapture.order ?? 0,
      attachments: (insertCapture.attachments as Attachment[]) || [],
    };
    this.captures.set(id, capture);
    return capture;
  }

  async updateCapture(id: string, updateData: Partial<InsertCapture>): Promise<Capture | undefined> {
    const capture = this.captures.get(id);
    if (!capture) return undefined;

    const updated: Capture = {
      ...capture,
      ...updateData,
      description:
        updateData.description !== undefined ? updateData.description ?? null : capture.description,
      attachments: updateData.attachments
        ? (updateData.attachments as Attachment[])
        : capture.attachments,
      updatedAt: new Date(),
    };
    this.captures.set(id, updated);
    return updated;
  }

  async deleteCapture(id: string): Promise<boolean> {
    return this.captures.delete(id);
  }

  // ----------------- Task Templates -----------------

  async getTaskTemplates(userId?: string): Promise<TaskTemplate[]> {
    return Array.from(this.taskTemplates.values()).filter(
      (t) => t.isDefault || t.userId === userId
    );
  }

  async createTaskTemplate(insertTemplate: InsertTaskTemplate): Promise<TaskTemplate> {
    const id = randomUUID();
    const template: TaskTemplate = {
      ...insertTemplate,
      id,
      createdAt: new Date(),
      isDefault: insertTemplate.isDefault ?? false,
      userId: insertTemplate.userId || null,
    };
    this.taskTemplates.set(id, template);
    return template;
  }

  async deleteTaskTemplate(id: string): Promise<boolean> {
    const template = this.taskTemplates.get(id);
    if (template && template.isDefault) return false; // Can't delete default templates
    return this.taskTemplates.delete(id);
  }

  // ----------------- Reminders -----------------

  async getCapturesWithReminders(userId: string): Promise<Capture[]> {
    const now = new Date();
    return Array.from(this.captures.values())
      .filter(
        (c) =>
          c.userId === userId &&
          c.reminderAt &&
          c.reminderAt > now &&
          (!c.snoozedUntil || c.snoozedUntil <= now) &&
          !c.isCompleted
      )
      .sort((a, b) => (a.reminderAt?.getTime() || 0) - (b.reminderAt?.getTime() || 0));
  }

  async getCapturesDue(userId: string, beforeDate?: Date): Promise<Capture[]> {
    const cutoff = beforeDate || new Date();
    return Array.from(this.captures.values())
      .filter(
        (c) =>
          c.userId === userId &&
          c.reminderAt &&
          c.reminderAt <= cutoff &&
          (!c.snoozedUntil || c.snoozedUntil <= cutoff) &&
          !c.isCompleted
      )
      .sort((a, b) => (a.reminderAt?.getTime() || 0) - (b.reminderAt?.getTime() || 0));
  }

  async updateReminderNotified(captureId: string): Promise<void> {
    const capture = this.captures.get(captureId);
    if (capture) {
      this.captures.set(captureId, { ...capture, lastNotifiedAt: new Date() });
    }
  }

  // ----------------- Users -----------------

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      biometricEnabled: insertUser.biometricEnabled ?? false,
    };
    this.users.set(id, user);

    // Give every new user the default buckets (idempotent per user)
    await this.createDefaultBuckets(id);

    return user;
  }
}

/** Singleton instance that persists across dev hot-reloads. */
declare global {
  // eslint-disable-next-line no-var
  var __memStorage__: MemStorage | undefined;
}

// Export the single shared instance
export const storage =
  globalThis.__memStorage__ ?? (globalThis.__memStorage__ = new MemStorage());

