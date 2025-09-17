#!/usr/bin/env python3
"""
Gene Expression Cancer Classification Model Training Script
Based on the gastric and lung cancer notebooks
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, roc_auc_score, cohen_kappa_score
from sklearn.feature_selection import SelectKBest, f_classif
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

def create_gastric_cancer_data():
    """Create gastric cancer dataset based on the notebook structure"""
    print("Creating gastric cancer dataset...")
    
    # Create synthetic gastric cancer gene expression data
    np.random.seed(42)
    n_samples = 500
    n_genes = 2000  # Reduced from 31k+ for practical purposes
    
    # Generate gene expression data
    X = np.random.exponential(2, (n_samples, n_genes))
    
    # Add some structure to make it more realistic
    # Some genes are more important for classification
    important_genes = np.random.choice(n_genes, size=50, replace=False)
    for i, gene_idx in enumerate(important_genes):
        X[:, gene_idx] += np.random.normal(0, 1, n_samples) * (i % 3 + 1)
    
    # Create labels (0: Normal, 1: Cancer)
    # Use a combination of important genes to determine labels
    cancer_score = np.sum(X[:, important_genes[:20]], axis=1)
    y = (cancer_score > np.percentile(cancer_score, 60)).astype(int)
    
    # Create gene names
    gene_names = [f"GENE_{i:04d}" for i in range(n_genes)]
    
    # Create DataFrame
    df = pd.DataFrame(X, columns=gene_names)
    df['Sample_Characteristics'] = ['Normal' if label == 0 else 'Cancer' for label in y]
    
    print(f"Gastric dataset created: {n_samples} samples, {n_genes} genes")
    print(f"Class distribution: {np.bincount(y)}")
    
    return df

def create_lung_cancer_data():
    """Create lung cancer dataset based on the notebook structure"""
    print("Creating lung cancer dataset...")
    
    # Create synthetic lung cancer gene expression data
    np.random.seed(123)
    n_samples = 600
    n_genes = 2000  # Reduced from 31k+ for practical purposes
    
    # Generate gene expression data
    X = np.random.exponential(1.5, (n_samples, n_genes))
    
    # Add some structure to make it more realistic
    important_genes = np.random.choice(n_genes, size=60, replace=False)
    for i, gene_idx in enumerate(important_genes):
        X[:, gene_idx] += np.random.normal(0, 1.2, n_samples) * (i % 4 + 1)
    
    # Create labels (0: Normal, 1: Cancer)
    cancer_score = np.sum(X[:, important_genes[:25]], axis=1)
    y = (cancer_score > np.percentile(cancer_score, 55)).astype(int)
    
    # Create gene names
    gene_names = [f"GENE_{i:04d}" for i in range(n_genes)]
    
    # Create DataFrame
    df = pd.DataFrame(X, columns=gene_names)
    df['classes'] = ['Normal' if label == 0 else 'Cancer' for label in y]
    
    print(f"Lung dataset created: {n_samples} samples, {n_genes} genes")
    print(f"Class distribution: {np.bincount(y)}")
    
    return df

def preprocess_gene_expression_data(df, target_column, n_features=1000):
    """Preprocess gene expression data and select top features"""
    
    # Separate features and target
    X = df.drop(columns=[target_column])
    y = df[target_column]
    
    # Encode target variable
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    print(f"Original features: {X.shape[1]}")
    
    # Feature selection - select top N features
    if X.shape[1] > n_features:
        selector = SelectKBest(score_func=f_classif, k=n_features)
        X_selected = selector.fit_transform(X, y_encoded)
        selected_features = X.columns[selector.get_support()].tolist()
        print(f"Selected top {n_features} features")
    else:
        X_selected = X.values
        selected_features = X.columns.tolist()
        print(f"Using all {X.shape[1]} features")
    
    return X_selected, y_encoded, selected_features, le

def train_ensemble_model(X_train, X_test, y_train, y_test, base_model, meta_model, model_name):
    """Train ensemble model with XGBoost as base and specified meta-learner"""
    
    # Train XGBoost base model
    xgb_model = XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=6,
        random_state=42,
        eval_metric='logloss'
    )
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

def train_models_for_dataset(df, dataset_name, target_column, n_features=1000):
    """Train all three ensemble models for a given gene expression dataset"""
    
    # Preprocess data
    X, y, selected_features, label_encoder = preprocess_gene_expression_data(df, target_column, n_features)
    
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
    print("Gene Expression Cancer Classification Model Training")
    print("=" * 60)
    
    # Create gastric cancer dataset
    gastric_df = create_gastric_cancer_data()
    train_models_for_dataset(gastric_df, 'gastric', 'Sample_Characteristics', n_features=1000)
    
    # Create lung cancer dataset
    lung_df = create_lung_cancer_data()
    train_models_for_dataset(lung_df, 'lung', 'classes', n_features=1000)
    
    print("\nModel training completed!")
    print("Saved models:")
    for dataset in ['gastric', 'lung']:
        for model_type in ['xgb_svm', 'xgb_lr', 'xgb_rf']:
            print(f"  models/{dataset}_cancer_{model_type}.pkl")

if __name__ == "__main__":
    main()
