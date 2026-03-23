import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import VotingClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

from model.preprocessor import preprocess

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'saved_model')
CATEGORIA_MODEL_PATH = os.path.join(MODEL_DIR, 'categoria_model.pkl')
PRIORIDADE_MODEL_PATH = os.path.join(MODEL_DIR, 'prioridade_model.pkl')
METRICS_PATH = os.path.join(MODEL_DIR, 'metrics.json')
VERSION_PATH = os.path.join(MODEL_DIR, 'version.json')


def build_pipeline():
    """Pipeline com ensemble: Logistic Regression + SVM calibrado."""
    lr = LogisticRegression(
        max_iter=2000,
        C=5.0,
        class_weight='balanced',
        random_state=42,
        solver='lbfgs',
    )

    svm = CalibratedClassifierCV(
        LinearSVC(
            max_iter=3000,
            C=1.0,
            class_weight='balanced',
            random_state=42,
        ),
        cv=3,
    )

    ensemble = VotingClassifier(
        estimators=[('lr', lr), ('svm', svm)],
        voting='soft',
        weights=[1, 1],
    )

    return Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=2,
            max_df=0.95,
        )),
        ('clf', ensemble),
    ])


def evaluate_model(model, X_test, y_test, label: str) -> dict:
    """Avalia o modelo com metricas detalhadas."""
    y_pred = model.predict(X_test)

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

    metrics = {
        'accuracy': round(acc, 4),
        'f1_weighted': round(f1, 4),
        'classification_report': report,
        'confusion_matrix': cm,
        'labels': list(model.classes_) if hasattr(model, 'classes_') else list(set(y_test)),
    }

    # Print readable report
    print(f"\n{'='*50}")
    print(f"  {label}")
    print(f"{'='*50}")
    print(f"  Accuracy:    {acc:.2%}")
    print(f"  F1 (weighted): {f1:.2%}")
    print(f"{'='*50}")
    print(classification_report(y_test, y_pred, zero_division=0))

    return metrics


def train(data_path: str) -> dict:
    """Treina os modelos com cross-validation e metricas detalhadas."""
    df = pd.read_csv(data_path)
    df['text_clean'] = df['text'].apply(preprocess)

    # Remove duplicatas e linhas vazias
    df = df.drop_duplicates(subset=['text_clean'])
    df = df[df['text_clean'].str.strip().str.len() > 0]

    print(f"\nDataset: {len(df)} amostras")
    print(f"Categorias: {dict(df['categoria'].value_counts())}")
    print(f"Prioridades: {dict(df['prioridade'].value_counts())}")

    os.makedirs(MODEL_DIR, exist_ok=True)

    all_metrics = {}

    # === Train category model ===
    cat_pipeline = build_pipeline()
    X_train, X_test, y_train, y_test = train_test_split(
        df['text_clean'], df['categoria'],
        test_size=0.2, random_state=42, stratify=df['categoria']
    )

    # Cross-validation antes do treino final
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(cat_pipeline, df['text_clean'], df['categoria'], cv=cv, scoring='f1_weighted')
    print(f"\nCategoria - Cross-validation F1: {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

    cat_pipeline.fit(X_train, y_train)
    cat_metrics = evaluate_model(cat_pipeline, X_test, y_test, "CATEGORIA MODEL")
    cat_metrics['cv_f1_mean'] = round(cv_scores.mean(), 4)
    cat_metrics['cv_f1_std'] = round(cv_scores.std(), 4)
    all_metrics['categoria'] = cat_metrics
    joblib.dump(cat_pipeline, CATEGORIA_MODEL_PATH)

    # === Train priority model ===
    pri_pipeline = build_pipeline()
    X_train, X_test, y_train, y_test = train_test_split(
        df['text_clean'], df['prioridade'],
        test_size=0.2, random_state=42, stratify=df['prioridade']
    )

    cv_scores = cross_val_score(pri_pipeline, df['text_clean'], df['prioridade'], cv=cv, scoring='f1_weighted')
    print(f"\nPrioridade - Cross-validation F1: {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

    pri_pipeline.fit(X_train, y_train)
    pri_metrics = evaluate_model(pri_pipeline, X_test, y_test, "PRIORIDADE MODEL")
    pri_metrics['cv_f1_mean'] = round(cv_scores.mean(), 4)
    pri_metrics['cv_f1_std'] = round(cv_scores.std(), 4)
    all_metrics['prioridade'] = pri_metrics
    joblib.dump(pri_pipeline, PRIORIDADE_MODEL_PATH)

    # Salva metricas
    all_metrics['dataset_size'] = len(df)
    all_metrics['trained_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(METRICS_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_metrics, f, indent=2, ensure_ascii=False, default=str)

    # Salva versao
    version = {'version': 1, 'trained_at': time.strftime('%Y-%m-%d %H:%M:%S')}
    if os.path.exists(VERSION_PATH):
        with open(VERSION_PATH, 'r') as f:
            old = json.load(f)
        version['version'] = old.get('version', 0) + 1
    with open(VERSION_PATH, 'w') as f:
        json.dump(version, f, indent=2)

    print(f"\nModels v{version['version']} saved to {MODEL_DIR}")

    return all_metrics


def load_models():
    cat_model = joblib.load(CATEGORIA_MODEL_PATH)
    pri_model = joblib.load(PRIORIDADE_MODEL_PATH)
    return cat_model, pri_model


def predict(text: str, cat_model, pri_model):
    clean = preprocess(text)

    # Predicao de categoria
    categoria = cat_model.predict([clean])[0]
    cat_proba = cat_model.predict_proba([clean])[0]
    cat_confidence = float(max(cat_proba))
    cat_all_proba = {cls: round(float(p), 4) for cls, p in zip(cat_model.classes_, cat_proba)}

    # Predicao de prioridade
    prioridade = pri_model.predict([clean])[0]
    pri_proba = pri_model.predict_proba([clean])[0]
    pri_confidence = float(max(pri_proba))
    pri_all_proba = {cls: round(float(p), 4) for cls, p in zip(pri_model.classes_, pri_proba)}

    # Score combinado (media ponderada — categoria pesa mais)
    score = round(cat_confidence * 0.6 + pri_confidence * 0.4, 4)

    return {
        'categoria': categoria,
        'prioridade': prioridade,
        'score': score,
        'detalhes': {
            'categoria_confianca': round(cat_confidence, 4),
            'prioridade_confianca': round(pri_confidence, 4),
            'categoria_probabilidades': cat_all_proba,
            'prioridade_probabilidades': pri_all_proba,
        }
    }


def get_metrics() -> dict:
    """Retorna metricas do ultimo treino."""
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def get_version() -> dict:
    """Retorna versao do modelo."""
    if os.path.exists(VERSION_PATH):
        with open(VERSION_PATH, 'r') as f:
            return json.load(f)
    return {'version': 0}
