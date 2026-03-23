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
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'data', 'config.json')
retrain_lock = threading.Lock()


def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    return {}


def save_config_file(config):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def get_anthropic_key():
    # First check config file, then env var
    config = load_config()
    key = config.get("anthropic_api_key", "")
    if not key:
        key = os.environ.get("ANTHROPIC_API_KEY", "")
    return key


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


@app.get("/config")
def get_config():
    """Get current configuration (without sensitive values)"""
    config = load_config()
    return {
        "anthropic_key_set": bool(config.get("anthropic_api_key", "")),
        "anthropic_key_preview": config.get("anthropic_api_key", "")[:12] + "..." if config.get("anthropic_api_key", "") else "",
    }


@app.post("/config")
def save_config(body: dict):
    """Save configuration"""
    config = load_config()
    if "anthropic_api_key" in body and body["anthropic_api_key"]:
        config["anthropic_api_key"] = body["anthropic_api_key"]
    save_config_file(config)
    return {"message": "Configuration saved", "anthropic_key_set": bool(config.get("anthropic_api_key", ""))}


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


@app.post("/predict-branch-type")
def predict_branch_type(body: dict):
    """Use Claude to determine the best branch type for a ticket"""
    text = body.get("text", "")
    categoria = body.get("categoria", "")

    api_key = get_anthropic_key()
    if not api_key:
        # Fallback: rule-based detection
        return {"branchType": detect_branch_type_rules(text, categoria)}

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            messages=[{
                "role": "user",
                "content": f"""Analyze this support ticket and determine the most appropriate git branch type.

Ticket text: "{text}"
Category: {categoria}

Branch type options:
- hotfix: Critical production errors, system down, data loss, security issues
- bugfix: Bugs, errors, exceptions, incorrect behavior
- fix: Minor fixes, small adjustments, typos
- feat: New features, new pages, new functionality, create something that doesn't exist
- refactor: Code restructuring, optimization, cleanup without behavior change
- docs: Documentation only changes
- chore: Config changes, dependency updates, maintenance

Respond with ONLY the branch type word (hotfix, bugfix, fix, feat, refactor, docs, or chore). Nothing else."""
            }]
        )
        branch_type = response.content[0].text.strip().lower()
        # Validate
        valid_types = ["hotfix", "bugfix", "fix", "feat", "refactor", "docs", "chore"]
        if branch_type not in valid_types:
            branch_type = detect_branch_type_rules(text, categoria)
        return {"branchType": branch_type}
    except Exception as e:
        print(f"Claude branch type detection failed: {e}")
        return {"branchType": detect_branch_type_rules(text, categoria)}


def detect_branch_type_rules(text: str, categoria: str = "") -> str:
    """Rule-based fallback for branch type detection"""
    text_lower = text.lower()

    # Hotfix - critical production issues
    hotfix_keywords = ["producao", "produção", "prod", "urgente", "critico", "crítico", "fora do ar",
                       "sistema caiu", "indisponivel", "indisponível", "emergencia", "emergência",
                       "perda de dados", "seguranca", "segurança", "vulnerabilidade"]
    if any(kw in text_lower for kw in hotfix_keywords):
        return "hotfix"

    # Bugfix - bugs and errors
    bugfix_keywords = ["erro", "bug", "falha", "exception", "nao funciona", "não funciona",
                       "quebrado", "incorreto", "problema", "defeito", "crash", "travando",
                       "nao abre", "não abre", "nao carrega", "não carrega", "500", "404",
                       "null", "nullpointer", "stacktrace"]
    if any(kw in text_lower for kw in bugfix_keywords):
        return "bugfix"

    # Feature - new things
    feat_keywords = ["criar", "novo", "nova", "adicionar", "implementar", "desenvolver",
                     "feature", "funcionalidade", "tela", "pagina", "página", "módulo", "modulo",
                     "integrar", "integracao", "integração", "construir"]
    if any(kw in text_lower for kw in feat_keywords):
        return "feat"

    # Refactor
    refactor_keywords = ["refatorar", "refactor", "otimizar", "melhorar performance",
                         "reestruturar", "limpar", "cleanup", "reorganizar"]
    if any(kw in text_lower for kw in refactor_keywords):
        return "refactor"

    # Docs
    docs_keywords = ["documentacao", "documentação", "readme", "doc", "manual", "guia"]
    if any(kw in text_lower for kw in docs_keywords):
        return "docs"

    # Chore
    chore_keywords = ["config", "configuracao", "configuração", "dependencia", "dependência",
                      "atualizar versao", "atualizar versão", "deploy", "ci/cd", "pipeline"]
    if any(kw in text_lower for kw in chore_keywords):
        return "chore"

    # Default based on category
    if categoria == "TECNICO":
        return "fix"
    return "fix"


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


# ===== TRAINING MANAGEMENT =====

GUIDELINES_PATH = os.path.join(os.path.dirname(__file__), 'data', 'guidelines.txt')


class TrainingSample(BaseModel):
    text: str
    categoria: str
    prioridade: str


class TrainingAddRequest(BaseModel):
    samples: list[TrainingSample]


class TrainingGenerateRequest(BaseModel):
    categoria: str
    prioridade: str
    quantidade: int = 20
    diretrizes: str = ""
    contexto: str = ""


class GuidelinesRequest(BaseModel):
    guidelines: str


@app.post("/training/add")
def add_training_data(request: TrainingAddRequest):
    """Adiciona exemplos de treino ao dataset."""
    added = 0
    with open(DATA_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        for sample in request.samples:
            if sample.text.strip():
                writer.writerow([sample.text.strip(), sample.categoria, sample.prioridade])
                added += 1
    return {"status": "ok", "added": added}


@app.get("/training/dataset")
def get_dataset_stats():
    """Retorna estatisticas do dataset de treino."""
    import pandas as pd
    df = pd.read_csv(DATA_PATH)

    cat_counts = df['categoria'].value_counts().to_dict()
    pri_counts = df['prioridade'].value_counts().to_dict()
    recent = df.tail(10).to_dict(orient='records')

    return {
        "total": len(df),
        "byCategoria": cat_counts,
        "byPrioridade": pri_counts,
        "recentSamples": recent,
    }


@app.post("/training/generate")
def generate_training_data(request: TrainingGenerateRequest):
    """Usa Claude para gerar dados de treino sinteticos."""
    api_key = get_anthropic_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    # Load guidelines if available
    guidelines_text = ""
    if os.path.exists(GUIDELINES_PATH):
        with open(GUIDELINES_PATH, 'r', encoding='utf-8') as f:
            guidelines_text = f.read()

    prompt = f"""Voce e um especialista em help desk. Gere {request.quantidade} exemplos realistas de tickets de suporte em portugues brasileiro.

Categoria: {request.categoria}
Prioridade: {request.prioridade}

{f"Diretrizes de classificacao da empresa:{chr(10)}{guidelines_text}" if guidelines_text else ""}
{f"Diretrizes especificas para esta geracao:{chr(10)}{request.diretrizes}" if request.diretrizes else ""}
{f"Contexto adicional:{chr(10)}{request.contexto}" if request.contexto else ""}

Regras:
1. Cada ticket deve ser unico e realista - como um usuario real escreveria
2. Varie o tom: formal, informal, com erros de digitacao, urgente, calmo
3. Varie o comprimento: curto (5-10 palavras), medio (10-20), longo (20-40)
4. NAO use virgulas no texto (o CSV vai quebrar)
5. O texto deve justificar a categoria {request.categoria} e prioridade {request.prioridade}

Responda SOMENTE com um JSON valido:
{{
  "samples": [
    {{"text": "texto do ticket aqui", "categoria": "{request.categoria}", "prioridade": "{request.prioridade}"}},
    ...
  ]
}}"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = re.sub(r'^```\w*\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)

        result = json.loads(response_text)
        return {"samples": result.get("samples", []), "count": len(result.get("samples", []))}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar dados: {str(e)}")


@app.post("/training/save-generated")
def save_generated_data(request: TrainingAddRequest):
    """Salva exemplos gerados (revisados) no dataset."""
    return add_training_data(request)


@app.get("/training/guidelines")
def get_guidelines():
    """Retorna diretrizes de classificacao."""
    if os.path.exists(GUIDELINES_PATH):
        with open(GUIDELINES_PATH, 'r', encoding='utf-8') as f:
            return {"guidelines": f.read()}
    return {"guidelines": ""}


@app.put("/training/guidelines")
def save_guidelines(request: GuidelinesRequest):
    """Salva diretrizes de classificacao."""
    os.makedirs(os.path.dirname(GUIDELINES_PATH), exist_ok=True)
    with open(GUIDELINES_PATH, 'w', encoding='utf-8') as f:
        f.write(request.guidelines)
    return {"status": "ok"}


@app.post("/training/retrain")
def retrain_training():
    """Re-treina o modelo e retorna metricas."""
    global cat_model, pri_model
    metrics = train(DATA_PATH)
    cat_model, pri_model = load_models()
    return {"status": "retrained", "metrics": metrics}


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

    api_key = get_anthropic_key()
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
