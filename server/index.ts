import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

/**
 * ---------- CORS SETUP ----------
 * Allow requests from:
 *   - capacitor://localhost     (Android/iOS WebView)
 *   - http://localhost, 127.0.0.1 (browser dev)
 *   - Your published Replit URL (set in CORS_ORIGIN secret)
 */
// Temporary ultra-permissive CORS for debugging
app.use(cors({
  origin: true,  // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
/** ---------- END CORS ---------- */

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log /api responses briefly
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let captured: unknown;

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    captured = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    const duration = Date.now() - start;
    let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    try {
      if (captured) line += ` :: ${JSON.stringify(captured)}`;
    } catch {}
    if (line.length > 120) line = line.slice(0, 119) + "…";
    log(line);
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      log(`serving on port ${port}`);
      log(`CORS: allowing all origins (debug mode)`);
    }
  );
})();