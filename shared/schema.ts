import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// Cancer dataset types
export const cancerDatasets = ["breast", "gastric", "lung"] as const;
export type CancerDataset = typeof cancerDatasets[number];

// Model types
export const modelTypes = ["xgb_svm", "xgb_lr", "xgb_rf"] as const;
export type ModelType = typeof modelTypes[number];

// Feature input schema for predictions
export const predictionInputSchema = z.object({
  dataset: z.enum(cancerDatasets),
  features: z.record(z.string(), z.number()),
});

export type PredictionInput = z.infer<typeof predictionInputSchema>;

// Individual model prediction result
export const modelPredictionSchema = z.object({
  model: z.enum(modelTypes),
  prediction: z.number(), // 0 or 1
  probability: z.number(), // confidence score
  label: z.string(), // "Benign" or "Malignant"
});

export type ModelPrediction = z.infer<typeof modelPredictionSchema>;

// Complete prediction response
export const predictionResponseSchema = z.object({
  dataset: z.enum(cancerDatasets),
  predictions: z.array(modelPredictionSchema),
  consensus: z.object({
    prediction: z.number(),
    confidence: z.number(),
    agreement: z.boolean(),
  }),
});

export type PredictionResponse = z.infer<typeof predictionResponseSchema>;

// Model metrics schema
export const modelMetricsSchema = z.object({
  model: z.enum(modelTypes),
  dataset: z.enum(cancerDatasets),
  accuracy: z.number(),
  precision: z.number(),
  auc: z.number(),
  kappa: z.number(),
});

export type ModelMetrics = z.infer<typeof modelMetricsSchema>;

// Metrics response schema
export const metricsResponseSchema = z.object({
  metrics: z.array(modelMetricsSchema),
});

export type MetricsResponse = z.infer<typeof metricsResponseSchema>;

// CSV upload schema
export const csvUploadSchema = z.object({
  dataset: z.enum(cancerDatasets),
  file: z.any(), // File object
});

export type CsvUpload = z.infer<typeof csvUploadSchema>;

// Batch prediction response
export const batchPredictionResponseSchema = z.object({
  dataset: z.enum(cancerDatasets),
  results: z.array(z.object({
    row: z.number(),
    predictions: z.array(modelPredictionSchema),
    consensus: z.object({
      prediction: z.number(),
      confidence: z.number(),
      agreement: z.boolean(),
    }),
  })),
});

export type BatchPredictionResponse = z.infer<typeof batchPredictionResponseSchema>;
