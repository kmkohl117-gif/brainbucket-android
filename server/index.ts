import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

/* ----------------------------- CORS setup ----------------------------- */
/**
 * Allow:
 *  - capacitor://localhost  (Android/iOS WebView default origin)
 *  - http://localhost / http://127.0.0.1 (local web dev)
 *  - An explicit origin from env (e.g. your Replit/web client URL)
 *
 * NOTE: If you use fetch with credentials: 'include', do not use '*' for origin.
 */
const allowedOrigins = [
  "capacitor://localhost",
  "http://localhost",
  "http://127.0.0.1",
  process.env.CORS_ORIGIN,      // e.g. https://<your-replit-subdomain>.repl.co
  process.env.VITE_APP_ORIGIN,  // optional extra slot if you prefer
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // No origin (mobile WebView/same-origin requests) → allow
    if (!origin) return callback(null, true);

    // Exact or prefix match against our allowlist
    const ok = allowedOrigins.some((o) => origin === o || origin.startsWith(o));
    return ok ? callback(null, true) : callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
/* --------------------------- end CORS setup --------------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* --------------------- request/response logging (/api) --------------------- */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          // ignore stringify issues
        }
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});
/* ------------------- end request/response logging -------------------- */

(async () => {
  // Register all API routes (once)
  const server = await registerRoutes(app);

  // Error handler (after routes)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // Re-throw so it shows in logs
    throw err;
  });

  // Vite dev server vs. static build
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve API + client on the same port
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      log(`CORS allowed origins: ${allowedOrigins.join(", ") || "(none)"}`);
    }
  );
})();
