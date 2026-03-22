#!/usr/bin/env python3
"""Train the ticket classification models."""

import os
from model.classifier import train

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'tickets_dataset.csv')

if __name__ == '__main__':
    print("Training TriageAI models...")
    train(DATA_PATH)
    print("Done!")
