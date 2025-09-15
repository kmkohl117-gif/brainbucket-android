import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  biometricEnabled: boolean("biometric_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const buckets = pgTable("buckets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  isDefault: boolean("is_default").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bucketId: varchar("bucket_id").references(() => buckets.id).notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const captures = pgTable("captures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'task', 'idea', 'reference'
  bucketId: varchar("bucket_id").references(() => buckets.id).notNull(),
  folderId: varchar("folder_id").references(() => folders.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  isStarred: boolean("is_starred").default(false),
  isCompleted: boolean("is_completed").default(false),
  order: integer("order").default(0),
  attachments: jsonb("attachments").$type<Attachment[]>().default([]),
  dueAt: timestamp("due_at"),
  reminderAt: timestamp("reminder_at"),
  snoozedUntil: timestamp("snoozed_until"),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskTemplates = pgTable("task_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  userId: varchar("user_id").references(() => users.id),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  biometricEnabled: true,
});

export const insertBucketSchema = createInsertSchema(buckets).pick({
  name: true,
  color: true,
  icon: true,
  userId: true,
  isDefault: true,
  order: true,
});

export const insertFolderSchema = createInsertSchema(folders).pick({
  name: true,
  bucketId: true,
  order: true,
});

export const insertCaptureSchema = createInsertSchema(captures).pick({
  text: true,
  description: true,
  type: true,
  bucketId: true,
  folderId: true,
  userId: true,
  isStarred: true,
  isCompleted: true,
  order: true,
  attachments: true,
  dueAt: true,
  reminderAt: true,
  snoozedUntil: true,
  lastNotifiedAt: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).pick({
  name: true,
  category: true,
  userId: true,
  isDefault: true,
});

export const reorderBucketsSchema = z.object({
  orderedIds: z.array(z.string()).min(1, "At least one bucket ID is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Bucket = typeof buckets.$inferSelect;
export type InsertBucket = z.infer<typeof insertBucketSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Capture = typeof captures.$inferSelect;
export type InsertCapture = z.infer<typeof insertCaptureSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;

export type CaptureType = 'task' | 'idea' | 'reference';

export type Attachment = {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
};
