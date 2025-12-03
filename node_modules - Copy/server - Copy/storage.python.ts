import type { 
  IStorage 
} from "./storage";
import type { 
  CancerDataset, 
  ModelMetrics, 
  PredictionInput, 
  PredictionResponse, 
  BatchPredictionResponse, 
  ModelPrediction 
} from "@shared/schema";

const PY_HOST = process.env.PY_HOST || "127.0.0.1";
const PY_PORT = process.env.PY_PORT || "8000";
const BASE_URL = `http://${PY_HOST}:${PY_PORT}`;

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export class PythonStorage implements IStorage {
  async getModelMetrics(): Promise<ModelMetrics[]> {
    const data = await http<{ metrics: ModelMetrics[] }>(`/metrics`);
    return data.metrics;
  }

  async getModelMetricsByDataset(dataset: CancerDataset): Promise<ModelMetrics[]> {
    const data = await http<{ metrics: ModelMetrics[] }>(`/metrics?dataset=${dataset}`);
    return data.metrics;
  }

  async predict(input: PredictionInput): Promise<PredictionResponse> {
    const data = await http<PredictionResponse>(`/predict`, {
      method: "POST",
      body: JSON.stringify({ dataset: input.dataset, features: input.features }),
    });
    return data;
  }

  async batchPredict(dataset: CancerDataset, features: Record<string, number>[]): Promise<BatchPredictionResponse> {
    const data = await http<BatchPredictionResponse>(`/predict/batch`, {
      method: "POST",
      body: JSON.stringify({ dataset, rows: features }),
    });
    return data;
  }
}

export const storage = new PythonStorage();


