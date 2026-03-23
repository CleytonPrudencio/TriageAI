#!/usr/bin/env python3
"""Train the ticket classification models with evaluation."""

import os
import json
from model.classifier import train, get_metrics

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'tickets_dataset.csv')

if __name__ == '__main__':
    print("=" * 60)
    print("  TriageAI - Model Training v2.0")
    print("=" * 60)

    metrics = train(DATA_PATH)

    print("\n" + "=" * 60)
    print("  RESUMO FINAL")
    print("=" * 60)
    print(f"  Dataset:             {metrics.get('dataset_size', '?')} amostras")
    print(f"  Categoria Accuracy:  {metrics['categoria']['accuracy']:.2%}")
    print(f"  Categoria F1:        {metrics['categoria']['f1_weighted']:.2%}")
    print(f"  Categoria CV F1:     {metrics['categoria']['cv_f1_mean']:.2%} (+/- {metrics['categoria']['cv_f1_std']:.2%})")
    print(f"  Prioridade Accuracy: {metrics['prioridade']['accuracy']:.2%}")
    print(f"  Prioridade F1:       {metrics['prioridade']['f1_weighted']:.2%}")
    print(f"  Prioridade CV F1:    {metrics['prioridade']['cv_f1_mean']:.2%} (+/- {metrics['prioridade']['cv_f1_std']:.2%})")
    print("=" * 60)
    print("Done!")
