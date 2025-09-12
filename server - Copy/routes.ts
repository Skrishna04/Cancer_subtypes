import type { Express } from "express";
import { createServer, type Server } from "http";
// Swap storage backend to Python-powered service
import { storage } from "./storage.python";
import { predictionInputSchema, csvUploadSchema, type CancerDataset } from "@shared/schema";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 500 * 1024 * 1024, // up to 500MB CSV
    fieldSize: 500 * 1024 * 1024, // up to 500MB field size
    fieldNameSize: 1000, // up to 1000 characters for field names
    fields: 100, // up to 100 fields
    files: 1, // only 1 file
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all model metrics
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await storage.getModelMetrics();
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve metrics" });
    }
  });

  // Get metrics for specific dataset
  app.get("/api/metrics/:dataset", async (req, res) => {
    try {
      const dataset = req.params.dataset as CancerDataset;
      if (!["breast", "gastric", "lung"].includes(dataset)) {
        return res.status(400).json({ message: "Invalid dataset" });
      }
      
      const metrics = await storage.getModelMetricsByDataset(dataset);
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve dataset metrics" });
    }
  });

  // Single prediction endpoint
  app.post("/api/predict", async (req, res) => {
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

  // CSV batch prediction endpoint
  app.post("/api/predict/batch", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const dataset = req.body.dataset as CancerDataset;
      if (!["breast", "gastric", "lung"].includes(dataset)) {
        return res.status(400).json({ message: "Invalid dataset" });
      }

      // Process CSV in chunks to reduce memory usage
      const results = [];
      const raw = req.file.buffer.toString("utf8");
      const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip BOM if present
      const stream = Readable.from(cleaned);
      
      let rowIndex = 0;
      const BATCH_SIZE = 500; // Process 500 rows at a time for maximum speed
      let currentBatch: Record<string, number>[] = [];
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", async (row) => {
            // Convert string values to numbers
            const numericRow: Record<string, number> = {};
            for (const [key, value] of Object.entries(row)) {
              const numValue = parseFloat(value as string);
              if (!isNaN(numValue)) {
                numericRow[key] = numValue;
              }
            }
            
            currentBatch.push(numericRow);
            rowIndex++;
            
            // Process batch when it reaches BATCH_SIZE
            if (currentBatch.length >= BATCH_SIZE) {
              try {
                const batchResults = await storage.batchPredict(dataset, currentBatch);
                results.push(...batchResults.results);
                currentBatch = []; // Clear batch to free memory
              } catch (error) {
                console.error("Batch processing error:", error);
                // Add error results for this batch
                for (let i = 0; i < currentBatch.length; i++) {
                  results.push({
                    row: rowIndex - currentBatch.length + i + 1,
                    features: Object.values(currentBatch[i]),
                    error: error instanceof Error ? error.message : "Prediction failed",
                  });
                }
                currentBatch = [];
              }
            }
          })
          .on("end", async () => {
            // Process remaining rows
            if (currentBatch.length > 0) {
              try {
                const batchResults = await storage.batchPredict(dataset, currentBatch);
                results.push(...batchResults.results);
              } catch (error) {
                console.error("Final batch processing error:", error);
                // Add error results for remaining rows
                for (let i = 0; i < currentBatch.length; i++) {
                  results.push({
                    row: rowIndex - currentBatch.length + i + 1,
                    features: Object.values(currentBatch[i]),
                    error: error instanceof Error ? error.message : "Prediction failed",
                  });
                }
              }
            }
            resolve(undefined);
          })
          .on("error", reject);
      });

      if (results.length === 0) {
        return res.status(400).json({ message: "No valid data found in CSV" });
      }

      res.json({
        dataset,
        results,
      });

    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Batch prediction failed" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
