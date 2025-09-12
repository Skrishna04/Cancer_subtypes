#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any
import uvicorn
import os

from model_service import get_model_service

app = FastAPI(title="CancerModelHub Python Service")


class PredictInput(BaseModel):
    dataset: str
    features: Dict[str, float]


class BatchPredictInput(BaseModel):
    dataset: str
    rows: List[Dict[str, float]]


@app.get("/health")
def health() -> Dict[str, Any]:
    service = get_model_service()
    return service.health_check()


@app.get("/metrics")
def metrics(dataset: str | None = None) -> Dict[str, Any]:
    service = get_model_service()
    return service.get_model_metrics(dataset)


@app.post("/predict")
def predict(payload: PredictInput) -> Dict[str, Any]:
    service = get_model_service()
    try:
        preds = service.predict_single(payload.dataset, payload.features)
        # normalize to array of models
        predictions = []
        for model_name, result in preds.items():
            predictions.append({
                "model": model_name,
                "prediction": int(result.get("prediction", 0)),
                "probability": float(result.get("probability", 0.0)),
                "label": str(result.get("label", "")),
            })

        # consensus (simple majority and avg confidence)
        malignant_votes = sum(1 for p in predictions if p["prediction"] == 1)
        consensus_pred = 1 if malignant_votes > (len(predictions) / 2.0) else 0
        avg_conf = sum(p["probability"] for p in predictions) / max(len(predictions), 1)
        agreement = all(p["prediction"] == consensus_pred for p in predictions) if predictions else False

        return {
            "dataset": payload.dataset,
            "predictions": predictions,
            "consensus": {
                "prediction": consensus_pred,
                "confidence": avg_conf,
                "agreement": agreement,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/predict/batch")
def predict_batch(payload: BatchPredictInput) -> Dict[str, Any]:
    service = get_model_service()
    try:
        batch = service.predict_batch(payload.dataset, payload.rows)
        # convert to expected shape
        converted = []
        for row in batch:
            preds = []
            for model_name, result in row.get("predictions", {}).items():
                preds.append({
                    "model": model_name,
                    "prediction": int(result.get("prediction", 0)),
                    "probability": float(result.get("probability", 0.0)),
                    "label": str(result.get("label", "")),
                })
            # simple consensus
            malignant_votes = sum(1 for p in preds if p["prediction"] == 1)
            consensus_pred = 1 if malignant_votes > (len(preds) / 2.0) else 0
            avg_conf = sum(p["probability"] for p in preds) / max(len(preds), 1)
            agreement = all(p["prediction"] == consensus_pred for p in preds) if preds else False

            converted.append({
                "row": int(row.get("row", 0)),
                "predictions": preds,
                "consensus": {
                    "prediction": consensus_pred,
                    "confidence": avg_conf,
                    "agreement": agreement,
                },
            })

        return {"dataset": payload.dataset, "results": converted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    host = os.environ.get("PY_HOST", "127.0.0.1")
    port = int(os.environ.get("PY_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)


