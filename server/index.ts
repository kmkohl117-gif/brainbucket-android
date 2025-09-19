console.log("EARLY: CORS_ORIGIN =", process.env.CORS_ORIGIN ?? "(unset)");
console.log("EARLY: NODE_ENV    =", process.env.NODE_ENV ?? "(unset)");


import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";   // ✅ only import once
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ✅ enable CORS for all requests
app.use(cors());

/* --------------------------- rest of your setup --------------------------- */

// (you probably already have other app.use() or route setup below this)


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
  "https://brain-bucket-kmkohl117.replit.app",
  process.env.CORS_ORIGIN,     // e.g. https://brain-bucket-xyz.replit.app
  process.env.VITE_APP_ORIGIN, // optional extra slot if you prefer
].filter(Boolean) as string[];

// Print what the process actually sees for CORS vars at boot:
log(`BOOT: process.env.CORS_ORIGIN = ${process.env.CORS_ORIGIN ?? "(unset)"}`);
log(
  `BOOT: allowedOrigins = ${
    allowedOrigins.length ? allowedOrigins.join(", ") : "(none)"
  }`
);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // No Origin header (mobile WebView / same-origin) → allow
    if (!origin) {
      console.log("CORS: request with no Origin header → allowed");
      return callback(null, true);
    }

    // Exact or prefix match against our allowlist
    const ok = allowedOrigins.some((o) => origin === o || origin.startsWith(o));
    console.log(`CORS check: incoming Origin="${origin}" -> ${ok ? "ALLOWED" : "BLOCKED"}`);

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
  (res as any).json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          // ignore stringify issues
        }
      }
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
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
    // Re-throw so it also shows in server logs
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
      // Extra plain logs so you always see them in the console:
      console.log("DEBUG: server started on port", port);
      console.log("DEBUG: allowedOrigins at boot =", allowedOrigins);
      console.log("DEBUG: CORS_ORIGIN =", process.env.CORS_ORIGIN);
    }
  );
})();
