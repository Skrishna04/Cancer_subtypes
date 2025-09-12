// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.python.ts
var PY_HOST = process.env.PY_HOST || "127.0.0.1";
var PY_PORT = process.env.PY_PORT || "8000";
var BASE_URL = `http://${PY_HOST}:${PY_PORT}`;
async function http(path3, options) {
  const res = await fetch(`${BASE_URL}${path3}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options && options.headers ? options.headers : {}
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}
var PythonStorage = class {
  async getModelMetrics() {
    const data = await http(`/metrics`);
    return data.metrics;
  }
  async getModelMetricsByDataset(dataset) {
    const data = await http(`/metrics?dataset=${dataset}`);
    return data.metrics;
  }
  async predict(input) {
    const data = await http(`/predict`, {
      method: "POST",
      body: JSON.stringify({ dataset: input.dataset, features: input.features })
    });
    return data;
  }
  async batchPredict(dataset, features) {
    const data = await http(`/predict/batch`, {
      method: "POST",
      body: JSON.stringify({ dataset, rows: features })
    });
    return data;
  }
};
var storage = new PythonStorage();

// shared/schema.ts
import { z } from "zod";
var cancerDatasets = ["breast", "gastric", "lung"];
var modelTypes = ["xgb_svm", "xgb_lr", "xgb_rf"];
var predictionInputSchema = z.object({
  dataset: z.enum(cancerDatasets),
  features: z.record(z.string(), z.number())
});
var modelPredictionSchema = z.object({
  model: z.enum(modelTypes),
  prediction: z.number(),
  // 0 or 1
  probability: z.number(),
  // confidence score
  label: z.string()
  // "Benign" or "Malignant"
});
var predictionResponseSchema = z.object({
  dataset: z.enum(cancerDatasets),
  predictions: z.array(modelPredictionSchema),
  consensus: z.object({
    prediction: z.number(),
    confidence: z.number(),
    agreement: z.boolean()
  })
});
var modelMetricsSchema = z.object({
  model: z.enum(modelTypes),
  dataset: z.enum(cancerDatasets),
  accuracy: z.number(),
  precision: z.number(),
  auc: z.number(),
  kappa: z.number()
});
var metricsResponseSchema = z.object({
  metrics: z.array(modelMetricsSchema)
});
var csvUploadSchema = z.object({
  dataset: z.enum(cancerDatasets),
  file: z.any()
  // File object
});
var batchPredictionResponseSchema = z.object({
  dataset: z.enum(cancerDatasets),
  results: z.array(z.object({
    row: z.number(),
    predictions: z.array(modelPredictionSchema),
    consensus: z.object({
      prediction: z.number(),
      confidence: z.number(),
      agreement: z.boolean()
    })
  }))
});

// server/routes.ts
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
var upload = multer({ storage: multer.memoryStorage() });
async function registerRoutes(app2) {
  app2.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await storage.getModelMetrics();
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve metrics" });
    }
  });
  app2.get("/api/metrics/:dataset", async (req, res) => {
    try {
      const dataset = req.params.dataset;
      if (!["breast", "gastric", "lung"].includes(dataset)) {
        return res.status(400).json({ message: "Invalid dataset" });
      }
      const metrics = await storage.getModelMetricsByDataset(dataset);
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve dataset metrics" });
    }
  });
  app2.post("/api/predict", async (req, res) => {
    try {
      const validatedInput = predictionInputSchema.parse(req.body);
      const prediction = await storage.predict(validatedInput);
      res.json(prediction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Prediction failed" });
      }
    }
  });
  app2.post("/api/predict/batch", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const dataset = req.body.dataset;
      if (!["breast", "gastric", "lung"].includes(dataset)) {
        return res.status(400).json({ message: "Invalid dataset" });
      }
      const csvData = [];
      const stream = Readable.from(req.file.buffer.toString());
      await new Promise((resolve, reject) => {
        stream.pipe(csv()).on("data", (row) => {
          const numericRow = {};
          for (const [key, value] of Object.entries(row)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              numericRow[key] = numValue;
            }
          }
          csvData.push(numericRow);
        }).on("end", resolve).on("error", reject);
      });
      if (csvData.length === 0) {
        return res.status(400).json({ message: "No valid data found in CSV" });
      }
      const batchResults = await storage.batchPredict(dataset, csvData);
      res.json(batchResults);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Batch prediction failed" });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "127.0.0.1";
  server.listen({
    port,
    host
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();
