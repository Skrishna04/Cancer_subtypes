#!/usr/bin/env python3
"""
Cancer Classification Model Training Script
Migrated from Colab notebooks to Replit environment
"""

import pandas as pd
import numpy as np
from sklearn.datasets import load_breast_cancer, load_wine, load_digits
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, roc_auc_score, cohen_kappa_score
import joblib
import os

def create_synthetic_gastric_data():
    """Create synthetic gastric cancer dataset for demonstration"""
    np.random.seed(42)
    n_samples = 500
    n_features = 20
    
    # Generate features
    X = np.random.randn(n_samples, n_features)
    # Add some correlation structure
    X[:, 1] = X[:, 0] + 0.5 * np.random.randn(n_samples)
    X[:, 2] = X[:, 0] - 0.3 * X[:, 1] + 0.4 * np.random.randn(n_samples)
    
    # Generate labels with some pattern
    y = (X[:, 0] + 0.5 * X[:, 1] - 0.3 * X[:, 2] + np.random.randn(n_samples) * 0.5 > 0).astype(int)
    
    return X, y

def create_synthetic_lung_data():
    """Create synthetic lung cancer dataset for demonstration"""
    np.random.seed(123)
    n_samples = 600
    n_features = 18
    
    # Generate features
    X = np.random.randn(n_samples, n_features)
    # Add some correlation structure
    for i in range(1, n_features):
        X[:, i] = 0.3 * X[:, 0] + 0.7 * np.random.randn(n_samples)
    
    # Generate labels
    y = (2 * X[:, 0] + X[:, 1] - X[:, 2] + np.random.randn(n_samples) * 0.7 > 0).astype(int)
    
    return X, y

def train_ensemble_model(X_train, X_test, y_train, y_test, base_model, meta_model, model_name):
    """Train ensemble model with XGBoost as base and specified meta-learner"""
    
    # Train XGBoost base model
    xgb_model = XGBClassifier(random_state=42, eval_metric='logloss')
    xgb_model.fit(X_train, y_train)
    
    # Get XGBoost predictions as features for meta-learner
    xgb_train_pred = xgb_model.predict_proba(X_train)[:, 1].reshape(-1, 1)
    xgb_test_pred = xgb_model.predict_proba(X_test)[:, 1].reshape(-1, 1)
    
    # Combine original features with XGBoost predictions
    meta_train_features = np.hstack([X_train, xgb_train_pred])
    meta_test_features = np.hstack([X_test, xgb_test_pred])
    
    # Train meta-learner
    meta_model.fit(meta_train_features, y_train)
    
    # Make final predictions
    y_pred = meta_model.predict(meta_test_features)
    y_pred_proba = meta_model.predict_proba(meta_test_features)[:, 1]
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    auc = roc_auc_score(y_test, y_pred_proba)
    kappa = cohen_kappa_score(y_test, y_pred)
    
    print(f"{model_name} Metrics:")
    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  AUC: {auc:.4f}")
    print(f"  Kappa: {kappa:.4f}")
    print()
    
    # Create ensemble model for saving
    ensemble_model = {
        'xgb_model': xgb_model,
        'meta_model': meta_model,
        'scaler': StandardScaler().fit(X_train),
        'metrics': {
            'accuracy': accuracy,
            'precision': precision,
            'auc': auc,
            'kappa': kappa
        }
    }
    
    return ensemble_model

def train_models_for_dataset(X, y, dataset_name):
    """Train all three ensemble models for a given dataset"""
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"\nTraining models for {dataset_name} cancer dataset...")
    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")
    print(f"Features: {X.shape[1]}")
    
    # Create output directory
    os.makedirs('models', exist_ok=True)
    
    # Train XGBoost + SVM
    svm_model = SVC(probability=True, random_state=42)
    xgb_svm = train_ensemble_model(X_train_scaled, X_test_scaled, y_train, y_test, 
                                   XGBClassifier, svm_model, "XGB + SVM")
    joblib.dump(xgb_svm, f'models/{dataset_name}_cancer_xgb_svm.pkl')
    
    # Train XGBoost + Logistic Regression
    lr_model = LogisticRegression(random_state=42, max_iter=1000)
    xgb_lr = train_ensemble_model(X_train_scaled, X_test_scaled, y_train, y_test,
                                  XGBClassifier, lr_model, "XGB + LR")
    joblib.dump(xgb_lr, f'models/{dataset_name}_cancer_xgb_lr.pkl')
    
    # Train XGBoost + Random Forest
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    xgb_rf = train_ensemble_model(X_train_scaled, X_test_scaled, y_train, y_test,
                                  XGBClassifier, rf_model, "XGB + RF")
    joblib.dump(xgb_rf, f'models/{dataset_name}_cancer_xgb_rf.pkl')

def main():
    """Main training function"""
    print("Cancer Classification Model Training")
    print("=" * 50)
    
    # Load datasets
    datasets = {}
    
    # Breast cancer dataset (built-in)
    print("Loading breast cancer dataset...")
    breast_data = load_breast_cancer()
    datasets['breast'] = (breast_data.data, breast_data.target)
    
    # Synthetic gastric cancer dataset
    print("Creating synthetic gastric cancer dataset...")
    gastric_X, gastric_y = create_synthetic_gastric_data()
    datasets['gastric'] = (gastric_X, gastric_y)
    
    # Synthetic lung cancer dataset
    print("Creating synthetic lung cancer dataset...")
    lung_X, lung_y = create_synthetic_lung_data()
    datasets['lung'] = (lung_X, lung_y)
    
    # Train models for each dataset
    for dataset_name, (X, y) in datasets.items():
        train_models_for_dataset(X, y, dataset_name)
    
    print("\nModel training completed!")
    print("Saved models:")
    for dataset in ['breast', 'gastric', 'lung']:
        for model_type in ['xgb_svm', 'xgb_lr', 'xgb_rf']:
            print(f"  models/{dataset}_cancer_{model_type}.pkl")

if __name__ == "__main__":
    main()
