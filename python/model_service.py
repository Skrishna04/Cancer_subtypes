#!/usr/bin/env python3
"""
Model Service for Cancer Classification
Handles model loading and prediction serving
"""

import joblib
import numpy as np
import pandas as pd
import os
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

class CancerModelService:
    """Service class for managing cancer classification models"""
    
    def __init__(self, models_dir: str = 'models'):
        self.models_dir = models_dir
        self.models = {}
        self.load_all_models()
    
    def load_all_models(self):
        """Load all trained models from disk"""
        datasets = ['breast', 'gastric', 'lung']
        model_types = ['xgb_svm', 'xgb_lr', 'xgb_rf']
        
        for dataset in datasets:
            self.models[dataset] = {}
            for model_type in model_types:
                model_path = os.path.join(self.models_dir, f'{dataset}_cancer_{model_type}.pkl')
                if os.path.exists(model_path):
                    try:
                        self.models[dataset][model_type] = joblib.load(model_path)
                        print(f"Loaded {dataset} {model_type} model")
                    except Exception as e:
                        print(f"Error loading {model_path}: {e}")
                        self.models[dataset][model_type] = None
                else:
                    print(f"Model file not found: {model_path}")
                    self.models[dataset][model_type] = None
    
    def predict_single(self, dataset: str, features: Dict[str, float]) -> Dict[str, Any]:
        """Make prediction for a single sample"""
        if dataset not in self.models:
            raise ValueError(f"Dataset {dataset} not supported")
        
        # Convert features to array
        feature_array = np.array(list(features.values())).reshape(1, -1)
        
        predictions = {}
        for model_type, model in self.models[dataset].items():
            if model is None:
                continue
                
            try:
                # Scale features if scaler is available
                if 'scaler' in model:
                    feature_array_scaled = model['scaler'].transform(feature_array)
                else:
                    feature_array_scaled = feature_array
                
                # Get XGBoost prediction
                xgb_pred = model['xgb_model'].predict_proba(feature_array_scaled)[:, 1]
                
                # Combine with original features for meta-learner
                meta_features = np.hstack([feature_array_scaled, xgb_pred.reshape(-1, 1)])
                
                # Get final prediction
                prediction = model['meta_model'].predict(meta_features)[0]
                probability = model['meta_model'].predict_proba(meta_features)[0, 1]
                
                predictions[model_type] = {
                    'prediction': int(prediction),
                    'probability': float(probability),
                    'label': 'Malignant' if prediction == 1 else 'Benign'
                }
                
            except Exception as e:
                print(f"Error predicting with {model_type}: {e}")
                predictions[model_type] = {
                    'prediction': 0,
                    'probability': 0.5,
                    'label': 'Error'
                }
        
        return predictions
    
    def predict_batch(self, dataset: str, features_list: List[Dict[str, float]]) -> List[Dict[str, Any]]:
        """Make predictions for multiple samples"""
        results = []
        for i, features in enumerate(features_list):
            try:
                predictions = self.predict_single(dataset, features)
                results.append({
                    'row': i + 1,
                    'predictions': predictions,
                    'success': True
                })
            except Exception as e:
                results.append({
                    'row': i + 1,
                    'predictions': {},
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    def get_model_metrics(self, dataset: str = None) -> Dict[str, Any]:
        """Get stored model metrics"""
        metrics = []
        
        datasets_to_check = [dataset] if dataset else self.models.keys()
        
        for ds in datasets_to_check:
            if ds not in self.models:
                continue
                
            for model_type, model in self.models[ds].items():
                if model is None or 'metrics' not in model:
                    continue
                
                model_metrics = model['metrics'].copy()
                model_metrics['dataset'] = ds
                model_metrics['model'] = model_type
                metrics.append(model_metrics)
        
        return {'metrics': metrics}
    
    def health_check(self) -> Dict[str, Any]:
        """Check if all models are loaded properly"""
        status = {}
        total_models = 0
        loaded_models = 0
        
        for dataset, models in self.models.items():
            status[dataset] = {}
            for model_type, model in models.items():
                is_loaded = model is not None
                status[dataset][model_type] = is_loaded
                total_models += 1
                if is_loaded:
                    loaded_models += 1
        
        return {
            'status': 'healthy' if loaded_models == total_models else 'partial',
            'loaded_models': loaded_models,
            'total_models': total_models,
            'details': status
        }

# Global model service instance
model_service = None

def get_model_service() -> CancerModelService:
    """Get global model service instance"""
    global model_service
    if model_service is None:
        model_service = CancerModelService()
    return model_service

if __name__ == "__main__":
    # Test the model service
    service = CancerModelService()
    
    # Health check
    health = service.health_check()
    print("Health check:", health)
    
    # Test prediction
    test_features = {
        'feature_1': 14.127,
        'feature_2': 19.289,
        'feature_3': 91.969,
        'feature_4': 654.889,
        'feature_5': 0.096,
        'feature_6': 0.104,
        'feature_7': 0.089,
        'feature_8': 0.048
    }
    
    try:
        predictions = service.predict_single('breast', test_features)
        print("Test predictions:", predictions)
    except Exception as e:
        print("Test prediction failed:", e)
    
    # Get metrics
    metrics = service.get_model_metrics()
    print("Model metrics:", metrics)
