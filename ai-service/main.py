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


def extract_file_paths_from_text(text: str) -> list[str]:
    """Extract explicit file paths mentioned in ticket text.

    Looks for patterns like:
    - src/main/java/com/example/Service.java
    - backend/services/ParcelService.java
    - components/Header.tsx
    """
    # Match file paths with at least one directory separator and a file extension
    path_pattern = r'(?:[\w.-]+/)+[\w.-]+\.(?:java|py|ts|tsx|js|jsx|go|rs|rb|php|cs|cpp|c|xml|yml|yaml|json|html|css|scss|vue|svelte|sql)'
    paths = re.findall(path_pattern, text)
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique


def extract_class_names_from_text(text: str) -> list[str]:
    """Extract class/component names mentioned in ticket text.

    Looks for PascalCase names like ParcelService, UserRepository, OrderController.
    """
    # Match PascalCase identifiers (at least two capital-starting segments)
    class_pattern = r'\b([A-Z][a-z]+(?:[A-Z][a-z0-9]*)+)\b'
    names = re.findall(class_pattern, text)
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for n in names:
        if n not in seen:
            seen.add(n)
            unique.append(n)
    return unique


def find_files_in_tree(file_tree: list[str], file_paths: list[str], class_names: list[str]) -> list[str]:
    """Find files in repo tree that match extracted paths or class names.

    Returns list of exact repo paths, prioritizing:
    1. Exact path matches (ticket mentions full path)
    2. Filename matches (ticket mentions class name that maps to a file)
    3. Related files (e.g., if Service is found, also include its Repository/Controller)
    """
    matched = []
    matched_set = set()

    # 1. Exact path matches - check if any extracted path is a suffix of a repo path
    for extracted_path in file_paths:
        for repo_path in file_tree:
            if repo_path.endswith(extracted_path) or repo_path == extracted_path:
                if repo_path not in matched_set:
                    matched.append(repo_path)
                    matched_set.add(repo_path)

    # 2. Class name matches - find files whose name matches a class name
    for class_name in class_names:
        for repo_path in file_tree:
            filename = repo_path.split('/')[-1].split('.')[0]
            if filename == class_name:
                if repo_path not in matched_set:
                    matched.append(repo_path)
                    matched_set.add(repo_path)

    # 3. Related files - for each matched file, look for related files
    #    e.g., if ParcelService.java is matched, also look for ParcelRepository, ParcelController, Parcel.java
    related_suffixes = ['Service', 'Repository', 'Controller', 'Dto', 'DTO', 'Entity', 'Model',
                        'Config', 'Exception', 'Mapper', 'Helper', 'Util', 'Interface',
                        'Specification', 'Spec', 'Filter', 'Request', 'Response']
    base_names = set()
    for path in list(matched):
        filename = path.split('/')[-1].split('.')[0]
        for suffix in related_suffixes:
            if filename.endswith(suffix):
                base_name = filename[:-len(suffix)]
                if base_name:
                    base_names.add(base_name)
                break
        else:
            base_names.add(filename)

    # Also extract base names from class names in ticket text
    for cn in class_names:
        for suffix in related_suffixes:
            if cn.endswith(suffix):
                base_name = cn[:-len(suffix)]
                if base_name:
                    base_names.add(base_name)
                break

    for base_name in base_names:
        for repo_path in file_tree:
            filename = repo_path.split('/')[-1].split('.')[0]
            # Match: filename starts with base_name OR contains base_name
            if (filename.startswith(base_name) or base_name in filename) and repo_path not in matched_set:
                if 'test' not in repo_path.lower() and 'spec/' not in repo_path.lower():
                    matched.append(repo_path)
                    matched_set.add(repo_path)

    # 4. Also search for files mentioned in ticket by partial name (e.g., "UserController" in text)
    #    This catches cases where class names use different prefixes (User vs Usuario)
    for cn in class_names:
        cn_lower = cn.lower()
        for repo_path in file_tree:
            filename_lower = repo_path.split('/')[-1].split('.')[0].lower()
            if filename_lower == cn_lower and repo_path not in matched_set:
                matched.append(repo_path)
                matched_set.add(repo_path)

    return matched


def score_files_fallback(file_tree: list[str], ticket_text: str) -> list[str]:
    """Fallback: score files by keyword matching when no explicit files are found.

    Used when the ticket doesn't mention specific file paths or class names.
    """
    priority_patterns = ['pom.xml', 'package.json', 'application', 'config',
                         'index', 'main', 'app', 'service', 'controller', 'model']

    keywords = set(w for w in re.findall(r'[a-zA-Z]+', ticket_text.lower()) if len(w) > 2)

    scored = []
    for f in file_tree:
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
        scored.append((f, score))

    scored.sort(key=lambda x: -x[1])
    return [f for f, s in scored[:10]]


def use_claude_to_identify_files(ticket_title: str, ticket_description: str,
                                  categoria: str, file_tree: list[str]) -> list[str]:
    """Use Claude to determine which files are likely affected based on the ticket and file tree."""
    api_key = get_anthropic_key()
    if not api_key:
        return []

    # Only send a manageable portion of the file tree
    tree_text = "\n".join(f"- {f}" for f in file_tree[:200])

    prompt = f"""Given this bug report and the repository file tree, identify which files most likely need to be modified to fix the bug.

## Bug Report
Title: {ticket_title}
Description: {ticket_description}
Category: {categoria}

## Repository Files
{tree_text}

## Instructions
Return ONLY a JSON array of file paths (max 10) that are most likely to need changes.
Focus on source code files, not config or test files.
Example: ["src/main/java/com/example/Service.java", "src/main/java/com/example/Controller.java"]

Return ONLY the JSON array, nothing else."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = re.sub(r'^```\w*\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)

        suggested = json.loads(response_text)
        # Validate that suggested paths exist in the file tree
        valid = [f for f in suggested if f in file_tree]
        print(f"Claude suggested {len(suggested)} files, {len(valid)} exist in repo")
        return valid
    except Exception as e:
        print(f"Claude file identification failed: {e}")
        return []


def analyze_with_claude(ticket_title: str, ticket_description: str, categoria: str,
                        file_contents: dict[str, str]) -> list[FileFix]:
    """Use Claude to analyze real file contents and generate fixes that modify existing files."""

    api_key = get_anthropic_key()
    if not api_key:
        print("ANTHROPIC_API_KEY not set, skipping Claude analysis")
        return []

    if not file_contents:
        print("No file contents to analyze")
        return []

    # Detect language from file extensions for syntax highlighting
    ext_to_lang = {
        '.java': 'java', '.py': 'python', '.ts': 'typescript', '.tsx': 'tsx',
        '.js': 'javascript', '.jsx': 'jsx', '.go': 'go', '.rs': 'rust',
        '.rb': 'ruby', '.php': 'php', '.cs': 'csharp', '.cpp': 'cpp', '.c': 'c',
        '.xml': 'xml', '.yml': 'yaml', '.yaml': 'yaml', '.json': 'json',
        '.html': 'html', '.css': 'css', '.scss': 'scss', '.sql': 'sql',
        '.vue': 'vue', '.svelte': 'svelte',
    }

    # Build file contents section
    files_section = ""
    for path, content in file_contents.items():
        ext = '.' + path.rsplit('.', 1)[-1] if '.' in path else ''
        lang = ext_to_lang.get(ext, '')
        # Truncate very large files to avoid exceeding context
        truncated = content[:12000] if len(content) > 12000 else content
        files_section += f"\n### File: {path}\n```{lang}\n{truncated}\n```\n"

    prompt = f"""You are a senior developer fixing a bug in a codebase.

## Bug Report
Title: {ticket_title}
Description: {ticket_description}
Category: {categoria}

## Existing Files (these are the REAL files from the repository - do NOT rename classes or change packages)
{files_section}

## Instructions
1. Analyze ALL provided files carefully - understand the real class names, packages, field names and relationships
2. Determine which files need to be modified to COMPLETELY fix the bug
3. Return ALL modified files with COMPLETE updated content
4. Fix EVERY file that needs changing - DTOs, Controllers, Services, Repositories, Specifications, Entities
5. Use the EXACT class names, field names and types you see in the provided files
6. If a DTO is missing a field, ADD IT. If a Controller needs auth, ADD IT
7. If a JPA entity uses @ManyToOne, use root.get("entity").get("id") NOT root.get("entityId")
8. Do NOT change class names, package names, or import paths
9. Keep all existing functionality intact
10. Add brief comments on changed lines explaining what was fixed

## Response Format
Respond with ONLY a valid JSON object:
{{
  "fixes": [
    {{
      "file_path": "exact/path/from/repo/FileName.java",
      "action": "modify",
      "content": "complete file content with fixes applied",
      "explanation": "what was changed and why"
    }}
  ]
}}

IMPORTANT:
- The file_path must match EXACTLY the path provided above
- For "modify" action, include the COMPLETE file content (not just the diff)
- For "create" action (only if truly needed), use the CORRECT package name matching the project structure
- NEVER invent class names - use the real ones from the codebase
- If no fixes are needed, return: {{"fixes": []}}
- Respond ONLY with JSON, no markdown, no extra explanation."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=32000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()

        # Clean response (remove markdown code blocks if present)
        if response_text.startswith("```"):
            response_text = re.sub(r'^```\w*\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)

        result = json.loads(response_text)
        fixes = []
        for fix_data in result.get("fixes", []):
            file_path = fix_data["file_path"]
            action = fix_data.get("action", "modify")
            content = fix_data["content"]
            explanation = fix_data["explanation"]

            # For "modify" action, originalCode is the real file content
            # For "create" action, originalCode is empty
            original_code = ""
            if action == "modify" and file_path in file_contents:
                original_code = file_contents[file_path]

            fixes.append(FileFix(
                filePath=file_path,
                originalCode=original_code,
                fixedCode=content,
                explanation=explanation,
            ))

        print(f"Claude generated {len(fixes)} fixes")
        return fixes

    except Exception as e:
        print(f"Claude analysis error: {e}")
        return []


@app.post("/analyze-code", response_model=CodeAnalysisResponseModel)
def analyze_code(request: CodeAnalysisRequest):
    """Analyze repository code using Claude AI to suggest/create fixes.

    Strategy:
    1. Parse ticket text for explicitly mentioned file paths and class names
    2. Match those against the real repo file tree
    3. If no explicit matches, use Claude to identify affected files
    4. Fallback to keyword scoring if all else fails
    5. Fetch actual file contents and send to Claude for fix generation
    """
    print(f"Analyzing repo {request.repo_owner}/{request.repo_name} for ticket: {request.ticket_title}")

    ticket_text = request.ticket_title + " " + request.ticket_description

    # Step 1: Fetch file tree from repo
    file_tree = fetch_repo_tree(
        request.repo_owner, request.repo_name,
        request.api_token, request.provider, request.default_branch
    )
    print(f"Found {len(file_tree)} files in repo")

    if not file_tree:
        return CodeAnalysisResponseModel(fixes=[])

    # Step 2: Extract file paths and class names from ticket text
    mentioned_paths = extract_file_paths_from_text(ticket_text)
    mentioned_classes = extract_class_names_from_text(ticket_text)
    print(f"Extracted from ticket - paths: {mentioned_paths}, classes: {mentioned_classes}")

    # Step 3: Find matching files in the repo tree
    target_files = find_files_in_tree(file_tree, mentioned_paths, mentioned_classes)
    print(f"Matched {len(target_files)} files from ticket references")

    # Step 4: If no files matched from text extraction, use Claude to identify files
    if not target_files:
        print("No explicit file matches found, asking Claude to identify affected files...")
        target_files = use_claude_to_identify_files(
            request.ticket_title, request.ticket_description,
            request.categoria, file_tree
        )

    # Step 5: Fallback to keyword scoring if still no files
    if not target_files:
        print("Claude file identification returned no results, falling back to keyword scoring...")
        target_files = score_files_fallback(file_tree, ticket_text)

    # Limit to 15 files maximum to ensure complete analysis
    target_files = target_files[:15]
    print(f"Final target files for analysis: {target_files}")

    # Step 6: Fetch actual content of target files
    file_contents = {}
    for file_path in target_files:
        content = fetch_file_content(
            request.repo_owner, request.repo_name,
            file_path, request.api_token, request.provider, request.default_branch
        )
        if content:
            file_contents[file_path] = content

    print(f"Fetched content of {len(file_contents)} files")

    if not file_contents:
        return CodeAnalysisResponseModel(fixes=[])

    # Step 7: Send real file contents to Claude for fix generation
    fixes = analyze_with_claude(
        request.ticket_title, request.ticket_description,
        request.categoria, file_contents
    )

    print(f"Total fixes from Claude: {len(fixes)}")
    return CodeAnalysisResponseModel(fixes=fixes)
