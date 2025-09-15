import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaptureSchema, insertBucketSchema, insertFolderSchema, insertTaskTemplateSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Folders
  app.get("/api/folders/bucket/:bucketId", async (req, res) => {
    try {
      const folders = await storage.getFoldersByBucket(req.params.bucketId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
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

  // File upload endpoint
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
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
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
