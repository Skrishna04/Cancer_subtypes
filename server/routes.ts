import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { predictionInputSchema, csvUploadSchema, type CancerDataset } from "@shared/schema";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

const upload = multer({ storage: multer.memoryStorage() });

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

      // Parse CSV from buffer
      const csvData: Record<string, number>[] = [];
      const stream = Readable.from(req.file.buffer.toString());
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", (row) => {
            // Convert string values to numbers
            const numericRow: Record<string, number> = {};
            for (const [key, value] of Object.entries(row)) {
              const numValue = parseFloat(value as string);
              if (!isNaN(numValue)) {
                numericRow[key] = numValue;
              }
            }
            csvData.push(numericRow);
          })
          .on("end", resolve)
          .on("error", reject);
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

  const httpServer = createServer(app);
  return httpServer;
}
