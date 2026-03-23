#!/usr/bin/env python3
"""TriageAI - AI Service for ticket classification."""

import os
import re
import csv
import threading
import base64
from contextlib import asynccontextmanager
from typing import Optional

import json
import requests
import anthropic
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from model.classifier import load_models, predict, train, get_metrics, get_version
from model.preprocessor import preprocess

cat_model = None
pri_model = None
feedback_count = 0
RETRAIN_THRESHOLD = 10

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'tickets_dataset.csv')
FEEDBACK_PATH = os.path.join(os.path.dirname(__file__), 'data', 'feedback.csv')
retrain_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cat_model, pri_model
    try:
        cat_model, pri_model = load_models()
        print("Models loaded successfully")
    except FileNotFoundError:
        print("No trained models found. Training now...")
        train(DATA_PATH)
        cat_model, pri_model = load_models()
        print("Models trained and loaded")
    yield


app = FastAPI(title="TriageAI - AI Service", version="2.0.0", lifespan=lifespan)


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    categoria: str
    prioridade: str
    score: float


class FeedbackData(BaseModel):
    ticket_id: int
    text: str
    categoria: str
    prioridade: str


def merge_feedback_and_retrain():
    """Merge feedback into main dataset and retrain models."""
    global cat_model, pri_model, feedback_count

    with retrain_lock:
        if not os.path.exists(FEEDBACK_PATH):
            return

        # Append feedback rows to main dataset
        with open(FEEDBACK_PATH, 'r', encoding='utf-8') as fb:
            reader = csv.reader(fb)
            next(reader, None)  # skip header
            rows = list(reader)

        if not rows:
            return

        with open(DATA_PATH, 'a', newline='', encoding='utf-8') as ds:
            writer = csv.writer(ds)
            for row in rows:
                writer.writerow(row)

        # Clear feedback file
        os.remove(FEEDBACK_PATH)
        feedback_count = 0

        # Retrain
        print(f"Auto-retrain triggered: {len(rows)} feedbacks merged into dataset")
        train(DATA_PATH)
        cat_model, pri_model = load_models()
        print("Models retrained successfully")


@app.get("/health")
def health():
    version = get_version()
    return {
        "status": "ok",
        "models_loaded": cat_model is not None,
        "model_version": version.get('version', 0),
        "feedback_pending": feedback_count,
        "retrain_threshold": RETRAIN_THRESHOLD,
    }


@app.get("/metrics")
def metrics():
    """Retorna metricas detalhadas do modelo (accuracy, F1, confusion matrix)."""
    m = get_metrics()
    if not m:
        raise HTTPException(status_code=404, detail="No metrics available. Train the model first.")
    return m


@app.get("/version")
def version():
    """Retorna versao e data do ultimo treino."""
    return get_version()


@app.post("/predict", response_model=PredictResponse)
def predict_ticket(request: PredictRequest):
    if cat_model is None or pri_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    result = predict(request.text, cat_model, pri_model)
    return PredictResponse(**result)


@app.post("/feedback")
def receive_feedback(data: FeedbackData):
    global feedback_count

    file_exists = os.path.exists(FEEDBACK_PATH)
    with open(FEEDBACK_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['text', 'categoria', 'prioridade'])
        writer.writerow([data.text, data.categoria, data.prioridade])

    feedback_count += 1
    should_retrain = feedback_count >= RETRAIN_THRESHOLD

    if should_retrain:
        thread = threading.Thread(target=merge_feedback_and_retrain)
        thread.start()

    return {
        "status": "feedback_received",
        "ticket_id": data.ticket_id,
        "feedback_count": feedback_count,
        "retrain_triggered": should_retrain,
    }


@app.post("/retrain")
def retrain_model():
    merge_feedback_and_retrain()
    return {"status": "retrained"}


# ===== CODE ANALYSIS FOR AUTO-FIX =====

class CodeAnalysisRequest(BaseModel):
    ticket_title: str
    ticket_description: str
    categoria: str
    repo_owner: str
    repo_name: str
    provider: str  # github, gitlab, bitbucket
    api_token: str
    default_branch: str = "main"


class FileFix(BaseModel):
    filePath: str
    originalCode: str
    fixedCode: str
    explanation: str


class CodeAnalysisResponseModel(BaseModel):
    fixes: list[FileFix]


def fetch_repo_tree(owner: str, repo: str, token: str, provider: str, branch: str) -> list[str]:
    """Fetch list of all files from repo."""
    if provider == "github":
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
        url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            print(f"Failed to fetch tree: {resp.status_code} {resp.text[:200]}")
            return []
        tree = resp.json().get("tree", [])
        extensions = {
            '.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.json',
            '.java', '.py', '.php', '.rb', '.go', '.cs', '.cpp', '.c', '.rs',
            '.vue', '.svelte', '.scss', '.sass', '.less', '.xml', '.yaml', '.yml',
            '.md', '.txt', '.cfg', '.ini', '.env', '.sql',
        }
        skip = {'node_modules/', '.git/', 'vendor/', 'dist/', 'build/', '.min.', 'package-lock'}
        result = []
        for item in tree:
            if item["type"] != "blob":
                continue
            path = item["path"]
            if any(s in path for s in skip):
                continue
            if any(path.endswith(ext) for ext in extensions):
                result.append(path)
        return result
    return []


def fetch_file_content(owner: str, repo: str, path: str, token: str, provider: str, branch: str) -> Optional[str]:
    """Fetch file content from repo."""
    if provider == "github":
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return None
        content_b64 = resp.json().get("content", "")
        return base64.b64decode(content_b64).decode("utf-8", errors="replace")
    return None


def analyze_with_claude(ticket_title: str, ticket_description: str, categoria: str,
                        file_tree: list[str], file_contents: dict[str, str]) -> list[FileFix]:
    """Usa Claude API para analisar codigo e gerar correcoes inteligentes."""

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("ANTHROPIC_API_KEY not set, skipping Claude analysis")
        return []

    # Monta contexto com arvore de arquivos e conteudo dos mais relevantes
    files_context = "## Arvore de arquivos do repositorio:\n"
    files_context += "\n".join(f"- {f}" for f in file_tree[:100])

    files_context += "\n\n## Conteudo dos arquivos relevantes:\n"
    for path, content in file_contents.items():
        # Limita conteudo para nao estourar contexto
        truncated = content[:8000] if len(content) > 8000 else content
        files_context += f"\n### {path}\n```\n{truncated}\n```\n"

    prompt = f"""Voce e um engenheiro de software senior. Analise o ticket de suporte e o codigo do repositorio abaixo.
Sua tarefa e gerar correcoes de codigo para resolver o problema descrito no ticket.

## Ticket
- Titulo: {ticket_title}
- Descricao: {ticket_description}
- Categoria: {categoria}

{files_context}

## Instrucoes
1. Analise o problema descrito no ticket
2. Identifique quais arquivos precisam ser modificados ou criados
3. Gere as correcoes necessarias
4. Se precisar CRIAR um arquivo novo que nao existe, use o campo filePath com o caminho desejado e originalCode vazio ""
5. Cada fix deve conter o codigo COMPLETO do arquivo (nao use "..." ou trechos parciais)

Responda APENAS com um JSON valido no formato:
{{
  "fixes": [
    {{
      "filePath": "caminho/do/arquivo.ext",
      "originalCode": "codigo original completo (vazio se arquivo novo)",
      "fixedCode": "codigo corrigido/novo completo",
      "explanation": "explicacao breve em portugues do que foi feito"
    }}
  ]
}}

Se nao houver correcoes a fazer, retorne: {{"fixes": []}}
Responda SOMENTE o JSON, sem markdown, sem explicacao extra."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()

        # Limpa resposta (remove markdown code blocks se houver)
        if response_text.startswith("```"):
            response_text = re.sub(r'^```\w*\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)

        result = json.loads(response_text)
        fixes = []
        for fix_data in result.get("fixes", []):
            fixes.append(FileFix(
                filePath=fix_data["filePath"],
                originalCode=fix_data.get("originalCode", ""),
                fixedCode=fix_data["fixedCode"],
                explanation=fix_data["explanation"]
            ))

        print(f"Claude generated {len(fixes)} fixes")
        return fixes

    except Exception as e:
        print(f"Claude analysis error: {e}")
        return []


@app.post("/analyze-code", response_model=CodeAnalysisResponseModel)
def analyze_code(request: CodeAnalysisRequest):
    """Analyze repository code using Claude AI to suggest/create fixes."""
    print(f"Analyzing repo {request.repo_owner}/{request.repo_name} for ticket: {request.ticket_title}")

    # 1. Fetch file tree from repo
    files = fetch_repo_tree(
        request.repo_owner, request.repo_name,
        request.api_token, request.provider, request.default_branch
    )
    print(f"Found {len(files)} files in repo")

    if not files:
        return CodeAnalysisResponseModel(fixes=[])

    # 2. Fetch content of the most relevant files (top 10 by size/importance)
    # Prioritize config files, main files, and source code
    priority_patterns = ['pom.xml', 'package.json', 'application', 'config',
                         'index', 'main', 'app', 'service', 'controller', 'model']

    scored_files = []
    text = (request.ticket_title + " " + request.ticket_description).lower()
    keywords = set(w for w in re.findall(r'[a-zA-Z]+', text) if len(w) > 2)

    for f in files:
        fname = f.lower()
        score = 0
        for kw in keywords:
            if kw in fname.replace("/", " ").replace("_", " ").replace("-", " "):
                score += 3
        for pat in priority_patterns:
            if pat in fname:
                score += 2
        if 'test' in fname or 'spec' in fname:
            score -= 5
        scored_files.append((f, score))

    scored_files.sort(key=lambda x: -x[1])
    top_files = [f for f, s in scored_files[:10]]
    print(f"Top files for analysis: {top_files}")

    # 3. Fetch content of top files
    file_contents = {}
    for file_path in top_files:
        content = fetch_file_content(
            request.repo_owner, request.repo_name,
            file_path, request.api_token, request.provider, request.default_branch
        )
        if content:
            file_contents[file_path] = content

    print(f"Fetched content of {len(file_contents)} files")

    # 4. Send to Claude for intelligent analysis
    fixes = analyze_with_claude(
        request.ticket_title, request.ticket_description,
        request.categoria, files, file_contents
    )

    print(f"Total fixes from Claude: {len(fixes)}")
    return CodeAnalysisResponseModel(fixes=fixes)
