import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from model.preprocessor import preprocess

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'saved_model')
CATEGORIA_MODEL_PATH = os.path.join(MODEL_DIR, 'categoria_model.pkl')
PRIORIDADE_MODEL_PATH = os.path.join(MODEL_DIR, 'prioridade_model.pkl')


def build_pipeline():
    return Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ('clf', LogisticRegression(max_iter=1000, C=1.0, random_state=42)),
    ])


def train(data_path: str):
    df = pd.read_csv(data_path)
    df['text_clean'] = df['text'].apply(preprocess)

    os.makedirs(MODEL_DIR, exist_ok=True)

    # Train category model
    cat_pipeline = build_pipeline()
    X_train, X_test, y_train, y_test = train_test_split(
        df['text_clean'], df['categoria'], test_size=0.2, random_state=42
    )
    cat_pipeline.fit(X_train, y_train)
    print("=== Categoria Model ===")
    print(classification_report(y_test, cat_pipeline.predict(X_test)))
    joblib.dump(cat_pipeline, CATEGORIA_MODEL_PATH)

    # Train priority model
    pri_pipeline = build_pipeline()
    X_train, X_test, y_train, y_test = train_test_split(
        df['text_clean'], df['prioridade'], test_size=0.2, random_state=42
    )
    pri_pipeline.fit(X_train, y_train)
    print("=== Prioridade Model ===")
    print(classification_report(y_test, pri_pipeline.predict(X_test)))
    joblib.dump(pri_pipeline, PRIORIDADE_MODEL_PATH)

    print(f"Models saved to {MODEL_DIR}")


def load_models():
    cat_model = joblib.load(CATEGORIA_MODEL_PATH)
    pri_model = joblib.load(PRIORIDADE_MODEL_PATH)
    return cat_model, pri_model


def predict(text: str, cat_model, pri_model):
    clean = preprocess(text)
    categoria = cat_model.predict([clean])[0]
    cat_proba = max(cat_model.predict_proba([clean])[0])

    prioridade = pri_model.predict([clean])[0]
    pri_proba = max(pri_model.predict_proba([clean])[0])

    score = round((cat_proba + pri_proba) / 2, 4)

    return {
        'categoria': categoria,
        'prioridade': prioridade,
        'score': score,
    }
