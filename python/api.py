#!/usr/bin/env python3
"""
Enhanced API for Cancer Classification with CSV Comparison
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import tempfile
import os
from model_service import get_model_service

app = FastAPI(title="Cancer Classification API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PredictInput(BaseModel):
    dataset: str
    features: Dict[str, float]

class BatchPredictInput(BaseModel):
    dataset: str
    rows: list

@app.get("/")
def root():
    return {"message": "Cancer Classification API v2.0", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0"}

@app.get("/datasets")
def get_datasets():
    """Get information about available datasets"""
    service = get_model_service()
    return service.get_dataset_info()

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
def predict_batch(dataset: str = Form(...), file: UploadFile = File(...)) -> Dict[str, Any]:
    """Process CSV file for batch predictions - supports up to 1GB files"""
    service = get_model_service()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Check file size (1GB limit)
    file_size = 0
    content = b""
    for chunk in file.file:
        file_size += len(chunk)
        if file_size > 1024 * 1024 * 1024:  # 1GB
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 1GB")
        content += chunk
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        result = service.predict_csv_batch(dataset, tmp_file_path)
        return result
    finally:
        # Clean up temporary file
        os.unlink(tmp_file_path)

@app.post("/analyze-csv")
def analyze_csv(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Analyze uploaded CSV and suggest compatible datasets - supports up to 1GB files"""
    service = get_model_service()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Check file size (1GB limit)
    file_size = 0
    content = b""
    for chunk in file.file:
        file_size += len(chunk)
        if file_size > 1024 * 1024 * 1024:  # 1GB
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 1GB")
        content += chunk
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        result = service.compare_csv_with_datasets(tmp_file_path)
        return result
    finally:
        # Clean up temporary file
        os.unlink(tmp_file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


