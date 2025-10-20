import { Express } from "express";
import multer from "multer";
import { Readable } from "stream";
import csv from "csv-parser";
import { predictionInputSchema, batchPredictionResponseSchema } from "@shared/schema";
import { storage } from "./storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit (1024MB)
    files: 1, // only 1 file
  },
});

export async function registerRoutes(app: Express): Promise<void> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Get model metrics
  app.get("/api/metrics", async (req, res) => {
    try {
      const dataset = req.query.dataset as string;
      const metrics = await storage.getModelMetricsByDataset(dataset);
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
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

      const dataset = req.body.dataset as string;
      if (!["breast", "gastric", "lung"].includes(dataset)) {
        return res.status(400).json({ message: "Invalid dataset" });
      }

      // Process CSV in chunks to reduce memory usage
      const results = [];
      const raw = req.file.buffer.toString("utf8");
      const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip BOM if present
      const stream = Readable.from(cleaned);
      
      let rowIndex = 0;
      const BATCH_SIZE = 1000; // Increased batch size for better performance
      let currentBatch: Record<string, number>[] = [];
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", (row) => {
            // Convert row to features (remove any target columns)
            const features: Record<string, number> = {};
            Object.entries(row).forEach(([key, value]) => {
              // Skip common target column names
              if (!["classes", "Sample_Characteristics", "target", "label", "diagnosis"].includes(key)) {
                const numValue = parseFloat(value as string);
                if (!isNaN(numValue)) {
                  features[key] = numValue;
                }
              }
            });
            
            if (Object.keys(features).length > 0) {
              currentBatch.push(features);
            }
            
            if (currentBatch.length >= BATCH_SIZE) {
              // Process batch
              currentBatch.forEach((features, batchIndex) => {
                const globalIndex = rowIndex - currentBatch.length + batchIndex;
                try {
                  const prediction = storage.predict({
                    dataset: dataset as any,
                    features
                  });
                  
                  results.push({
                    row: globalIndex,
                    predictions: prediction.predictions,
                    consensus: prediction.consensus
                  });
                } catch (error) {
                  results.push({
                    row: globalIndex,
                    error: error instanceof Error ? error.message : "Unknown error",
                    features
                  });
                }
              });
              
              currentBatch = [];
            }
            
            rowIndex++;
          })
          .on("end", () => {
            // Process remaining batch
            currentBatch.forEach((features, batchIndex) => {
              const globalIndex = rowIndex - currentBatch.length + batchIndex;
              try {
                const prediction = storage.predict({
                  dataset: dataset as any,
                  features
                });
                
                results.push({
                  row: globalIndex,
                  predictions: prediction.predictions,
                  consensus: prediction.consensus
                });
              } catch (error) {
                results.push({
                  row: globalIndex,
                  error: error instanceof Error ? error.message : "Unknown error",
                  features
                });
              }
            });
            
            resolve(undefined);
          })
          .on("error", reject);
      });

      const response = {
        dataset,
        results: results.slice(0, 5000), // Increased limit to 5000 results
        total_processed: results.length
      };

      res.json(response);
    } catch (error) {
      console.error("Batch prediction error:", error);
      res.status(500).json({ 
        message: "Batch prediction failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // New CSV analysis endpoint
  app.post("/api/analyze-csv", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Basic CSV analysis
      const raw = req.file.buffer.toString("utf8");
      const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      const lines = cleaned.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have at least a header and one data row" });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.length - 1;
      
      // Check for target columns
      const targetCandidates = ['classes', 'Sample_Characteristics', 'target', 'label', 'diagnosis'];
      const targetColumn = targetCandidates.find(col => headers.includes(col));
      
      // Suggest datasets based on feature count
      const featureCount = headers.length - (targetColumn ? 1 : 0);
      const suggestedDatasets = [];
      
      if (featureCount <= 10) {
        suggestedDatasets.push('breast');
      }
      if (featureCount > 100) {
        suggestedDatasets.push('gastric', 'lung');
      }
      if (suggestedDatasets.length === 0) {
        suggestedDatasets.push('breast', 'gastric', 'lung');
      }

      res.json({
        filename: req.file.originalname,
        rows: dataRows,
        columns: headers,
        column_count: headers.length,
        has_target: !!targetColumn,
        target_column: targetColumn,
        suggested_datasets: suggestedDatasets
      });
    } catch (error) {
      console.error("CSV analysis error:", error);
      res.status(500).json({ 
        message: "CSV analysis failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Survival analysis endpoint
  app.get("/api/survival-analysis", async (req, res) => {
    try {
      const dataset = req.query.dataset as string;
      
      // Breast cancer subtype survival analysis data (replicating the images)
      const survivalData = {
        dataset: dataset || "breast",
        kaplan_meier_curves: [
          {
            group: "LumA",
            data: [
              { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
              { time: 1000, survival_probability: 0.95, at_risk: 95, events: 5 },
              { time: 2000, survival_probability: 0.85, at_risk: 85, events: 10 },
              { time: 3000, survival_probability: 0.75, at_risk: 75, events: 10 },
              { time: 4000, survival_probability: 0.6, at_risk: 60, events: 15 },
              { time: 5000, survival_probability: 0.4, at_risk: 40, events: 20 },
              { time: 6000, survival_probability: 0.4, at_risk: 40, events: 0 },
              { time: 7000, survival_probability: 0.35, at_risk: 35, events: 5 },
              { time: 8000, survival_probability: 0.35, at_risk: 35, events: 0 }
            ],
            median_survival: 4800,
            p_value: 0.001
          },
          {
            group: "Her2",
            data: [
              { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
              { time: 1000, survival_probability: 0.9, at_risk: 90, events: 10 },
              { time: 2000, survival_probability: 0.8, at_risk: 80, events: 10 },
              { time: 3000, survival_probability: 0.7, at_risk: 70, events: 10 },
              { time: 4000, survival_probability: 0.6, at_risk: 60, events: 10 },
              { time: 5000, survival_probability: 0.5, at_risk: 50, events: 10 },
              { time: 6000, survival_probability: 0.5, at_risk: 50, events: 0 },
              { time: 6500, survival_probability: 0.5, at_risk: 50, events: 0 }
            ],
            median_survival: 5500,
            p_value: 0.001
          },
          {
            group: "LumB",
            data: [
              { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
              { time: 1000, survival_probability: 0.9, at_risk: 90, events: 10 },
              { time: 2000, survival_probability: 0.8, at_risk: 80, events: 10 },
              { time: 3000, survival_probability: 0.7, at_risk: 70, events: 10 },
              { time: 4000, survival_probability: 0.5, at_risk: 50, events: 20 },
              { time: 4500, survival_probability: 0.25, at_risk: 25, events: 25 },
              { time: 4800, survival_probability: 0.25, at_risk: 25, events: 0 }
            ],
            median_survival: 4200,
            p_value: 0.001
          },
          {
            group: "Normal",
            data: [
              { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
              { time: 1000, survival_probability: 0.95, at_risk: 95, events: 5 },
              { time: 2000, survival_probability: 0.85, at_risk: 85, events: 10 },
              { time: 3000, survival_probability: 0.7, at_risk: 70, events: 15 },
              { time: 4000, survival_probability: 0.65, at_risk: 65, events: 5 },
              { time: 4200, survival_probability: 0.0, at_risk: 0, events: 65 },
              { time: 4500, survival_probability: 0.0, at_risk: 0, events: 0 }
            ],
            median_survival: 4100,
            p_value: 0.001
          },
          {
            group: "Basal",
            data: [
              { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
              { time: 1000, survival_probability: 0.95, at_risk: 95, events: 5 },
              { time: 2000, survival_probability: 0.8, at_risk: 80, events: 15 },
              { time: 3000, survival_probability: 0.75, at_risk: 75, events: 5 },
              { time: 4000, survival_probability: 0.65, at_risk: 65, events: 10 },
              { time: 5000, survival_probability: 0.65, at_risk: 65, events: 0 },
              { time: 6000, survival_probability: 0.65, at_risk: 65, events: 0 },
              { time: 7000, survival_probability: 0.65, at_risk: 65, events: 0 },
              { time: 7500, survival_probability: 0.45, at_risk: 45, events: 20 },
              { time: 8500, survival_probability: 0.45, at_risk: 45, events: 0 }
            ],
            median_survival: 7200,
            p_value: 0.001
          }
        ],
        cox_regression: [
          {
            variable: "BRCA_Subtype_PAM50_Her2",
            hazard_ratio: 1.92,
            confidence_interval_lower: 1.28,
            confidence_interval_upper: 3.49,
            p_value: 0.001,
            coefficient: 0.65
          },
          {
            variable: "BRCA_Subtype_PAM50_LumB",
            hazard_ratio: 1.42,
            confidence_interval_lower: 0.95,
            confidence_interval_upper: 2.34,
            p_value: 0.08,
            coefficient: 0.35
          },
          {
            variable: "BRCA_Subtype_PAM50_Normal",
            hazard_ratio: 1.42,
            confidence_interval_lower: 0.64,
            confidence_interval_upper: 3.16,
            p_value: 0.38,
            coefficient: 0.35
          },
          {
            variable: "BRCA_Subtype_PAM50_LumA",
            hazard_ratio: 0.86,
            confidence_interval_lower: 0.61,
            confidence_interval_upper: 1.42,
            p_value: 0.55,
            coefficient: -0.15
          }
        ],
        overall_p_value: 0.001,
        concordance_index: 0.78
      };

      res.json(survivalData);
    } catch (error) {
      console.error("Survival analysis error:", error);
      res.status(500).json({ 
        message: "Survival analysis failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}
