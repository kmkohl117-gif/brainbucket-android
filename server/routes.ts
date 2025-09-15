import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaptureSchema, insertBucketSchema, insertFolderSchema, insertTaskTemplateSchema, reorderBucketsSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import express from "express";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Mock user ID for now (in real app, this would come from authentication)
  const mockUserId = "user-123";

  // Captures
  app.get("/api/captures", async (req, res) => {
    try {
      const captures = await storage.getCapturesByUser(mockUserId);
      res.json(captures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch captures" });
    }
  });

  app.get("/api/captures/bucket/:bucketId", async (req, res) => {
    try {
      const captures = await storage.getCapturesByBucket(req.params.bucketId);
      res.json(captures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bucket captures" });
    }
  });

  app.get("/api/captures/folder/:folderId", async (req, res) => {
    try {
      const captures = await storage.getCapturesByFolder(req.params.folderId);
      res.json(captures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folder captures" });
    }
  });

  app.get("/api/captures/:id", async (req, res) => {
    try {
      const capture = await storage.getCapture(req.params.id);
      if (!capture) {
        return res.status(404).json({ error: "Capture not found" });
      }
      res.json(capture);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch capture" });
    }
  });

  app.post("/api/captures", async (req, res) => {
    try {
      const validation = insertCaptureSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid capture data", details: validation.error });
      }

      const captureData = { ...validation.data, userId: mockUserId };
      const capture = await storage.createCapture(captureData);
      res.json(capture);
    } catch (error) {
      res.status(500).json({ error: "Failed to create capture" });
    }
  });

  app.patch("/api/captures/:id", async (req, res) => {
    try {
      const updates = req.body;
      const capture = await storage.updateCapture(req.params.id, updates);
      if (!capture) {
        return res.status(404).json({ error: "Capture not found" });
      }
      res.json(capture);
    } catch (error) {
      res.status(500).json({ error: "Failed to update capture" });
    }
  });

  app.delete("/api/captures/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCapture(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Capture not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete capture" });
    }
  });

  // Buckets
  app.get("/api/buckets", async (req, res) => {
    try {
      const buckets = await storage.getBucketsByUser(mockUserId);
      res.json(buckets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch buckets" });
    }
  });

  app.get("/api/buckets/:id", async (req, res) => {
    try {
      const bucket = await storage.getBucket(req.params.id);
      if (!bucket) {
        return res.status(404).json({ error: "Bucket not found" });
      }
      res.json(bucket);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bucket" });
    }
  });

  app.post("/api/buckets", async (req, res) => {
    try {
      const validation = insertBucketSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid bucket data", details: validation.error });
      }

      const bucketData = { ...validation.data, userId: mockUserId };
      const bucket = await storage.createBucket(bucketData);
      res.json(bucket);
    } catch (error) {
      res.status(500).json({ error: "Failed to create bucket" });
    }
  });

  app.post("/api/buckets/reorder", async (req, res) => {
    try {
      const validation = reorderBucketsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid reorder data", details: validation.error });
      }

      const { orderedIds } = validation.data;
      const buckets = await storage.reorderBuckets(mockUserId, orderedIds);
      res.json(buckets);
    } catch (error) {
      console.error("Bucket reorder error:", error);
      if (error instanceof Error && error.message.includes("Invalid bucket IDs")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to reorder buckets" });
    }
  });

  // Folders
  app.get("/api/folders/bucket/:bucketId", async (req, res) => {
    try {
      const folders = await storage.getFoldersByBucket(req.params.bucketId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.get("/api/folders/:id", async (req, res) => {
    try {
      const folder = await storage.getFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }
      res.json(folder);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folder" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const validation = insertFolderSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid folder data", details: validation.error });
      }

      const folder = await storage.createFolder(validation.data);
      res.json(folder);
    } catch (error) {
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // Task Templates
  app.get("/api/task-templates", async (req, res) => {
    try {
      const templates = await storage.getTaskTemplates(mockUserId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task templates" });
    }
  });

  app.post("/api/task-templates", async (req, res) => {
    try {
      const validation = insertTaskTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid template data", details: validation.error });
      }

      const templateData = { ...validation.data, userId: mockUserId };
      const template = await storage.createTaskTemplate(templateData);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task template" });
    }
  });

  // Reminders
  app.get("/api/reminders", async (req, res) => {
    try {
      const reminders = await storage.getCapturesWithReminders(mockUserId);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.get("/api/reminders/due", async (req, res) => {
    try {
      const beforeDate = req.query.before ? new Date(req.query.before as string) : undefined;
      const dueReminders = await storage.getCapturesDue(mockUserId, beforeDate);
      res.json(dueReminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch due reminders" });
    }
  });

  app.post("/api/reminders/:captureId/notified", async (req, res) => {
    try {
      await storage.updateReminderNotified(req.params.captureId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update reminder notification" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // File type validation - allow common document, image, and media types
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'audio/mpeg', 'audio/wav', 'video/mp4', 'video/quicktime'
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: `File type ${req.file.mimetype} not allowed` });
      }

      // File size validation (already handled by multer, but adding explicit check)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB" });
      }

      const fileInfo = {
        id: Date.now().toString(),
        name: req.file.originalname,
        type: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size,
      };

      res.json(fileInfo);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
