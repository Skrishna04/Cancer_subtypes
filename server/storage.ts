import { 
  type ModelMetrics, 
  type PredictionResponse, 
  type CancerDataset,
  type ModelType,
  type PredictionInput,
  type BatchPredictionResponse
} from "@shared/schema";

export interface IStorage {
  getModelMetrics(): Promise<ModelMetrics[]>;
  getModelMetricsByDataset(dataset: CancerDataset): Promise<ModelMetrics[]>;
  predict(input: PredictionInput): Promise<PredictionResponse>;
  batchPredict(dataset: CancerDataset, features: Record<string, number>[]): Promise<BatchPredictionResponse>;
}

export class MemStorage implements IStorage {
  private metrics: ModelMetrics[];

  constructor() {
    // Initialize with realistic model performance metrics
    this.metrics = [
      // Breast Cancer Models
      { model: "xgb_svm", dataset: "breast", accuracy: 0.952, precision: 0.947, auc: 0.963, kappa: 0.901 },
      { model: "xgb_lr", dataset: "breast", accuracy: 0.965, precision: 0.958, auc: 0.971, kappa: 0.925 },
      { model: "xgb_rf", dataset: "breast", accuracy: 0.958, precision: 0.951, auc: 0.967, kappa: 0.913 },
      
      // Gastric Cancer Models
      { model: "xgb_svm", dataset: "gastric", accuracy: 0.934, precision: 0.928, auc: 0.951, kappa: 0.867 },
      { model: "xgb_lr", dataset: "gastric", accuracy: 0.948, precision: 0.941, auc: 0.964, kappa: 0.895 },
      { model: "xgb_rf", dataset: "gastric", accuracy: 0.941, precision: 0.935, auc: 0.958, kappa: 0.881 },
      
      // Lung Cancer Models
      { model: "xgb_svm", dataset: "lung", accuracy: 0.967, precision: 0.962, auc: 0.978, kappa: 0.933 },
      { model: "xgb_lr", dataset: "lung", accuracy: 0.973, precision: 0.968, auc: 0.984, kappa: 0.945 },
      { model: "xgb_rf", dataset: "lung", accuracy: 0.970, precision: 0.965, auc: 0.981, kappa: 0.939 },
    ];
  }

  async getModelMetrics(): Promise<ModelMetrics[]> {
    return this.metrics;
  }

  async getModelMetricsByDataset(dataset: CancerDataset): Promise<ModelMetrics[]> {
    return this.metrics.filter(m => m.dataset === dataset);
  }

  async predict(input: PredictionInput): Promise<PredictionResponse> {
    // Simulate model predictions based on feature values
    const { dataset, features } = input;
    
    // Simple prediction logic based on feature values
    const featureSum = Object.values(features).reduce((sum, val) => sum + val, 0);
    const featureAvg = featureSum / Object.values(features).length;
    
    // Generate predictions for each model with slight variations
    const predictions = [
      {
        model: "xgb_svm" as ModelType,
        prediction: featureAvg > 50 ? 1 : 0,
        probability: Math.min(0.99, Math.max(0.01, (featureAvg / 100) + Math.random() * 0.1)),
        label: featureAvg > 50 ? "Malignant" : "Benign"
      },
      {
        model: "xgb_lr" as ModelType,
        prediction: featureAvg > 45 ? 1 : 0,
        probability: Math.min(0.99, Math.max(0.01, (featureAvg / 95) + Math.random() * 0.1)),
        label: featureAvg > 45 ? "Malignant" : "Benign"
      },
      {
        model: "xgb_rf" as ModelType,
        prediction: featureAvg > 48 ? 1 : 0,
        probability: Math.min(0.99, Math.max(0.01, (featureAvg / 98) + Math.random() * 0.1)),
        label: featureAvg > 48 ? "Malignant" : "Benign"
      }
    ];

    // Calculate consensus
    const consensusPrediction = predictions.filter(p => p.prediction === 1).length > 1 ? 1 : 0;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length;
    const agreement = predictions.every(p => p.prediction === consensusPrediction);

    return {
      dataset,
      predictions,
      consensus: {
        prediction: consensusPrediction,
        confidence: avgConfidence,
        agreement
      }
    };
  }

  async batchPredict(dataset: CancerDataset, features: Record<string, number>[]): Promise<BatchPredictionResponse> {
    const results = [];
    
    for (let i = 0; i < features.length; i++) {
      const prediction = await this.predict({ dataset, features: features[i] });
      results.push({
        row: i + 1,
        predictions: prediction.predictions,
        consensus: prediction.consensus
      });
    }

    return {
      dataset,
      results
    };
  }
}

export const storage = new MemStorage();
