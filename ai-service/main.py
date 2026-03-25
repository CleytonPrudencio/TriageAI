#!/usr/bin/env python3
"""TriageAI - AI Service for ticket classification."""

import os
import re
import csv
import threading
import base64
import time
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

import json
import requests
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

    # Start autonomous learning loop
    start_learning()

    yield

    # Stop learning on shutdown
    stop_learning()


app = FastAPI(title="TriageAI - AI Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    global LEARNING_INTERVAL, SAMPLES_PER_CYCLE
    config = load_config()
    if "anthropic_api_key" in body and body["anthropic_api_key"]:
        config["anthropic_api_key"] = body["anthropic_api_key"]
    for key in ["learning_interval", "learning_samples", "learning_retrain_threshold", "auto_learning_enabled"]:
        if key in body:
            config[key] = body[key]
    if "learning_interval" in body:
        LEARNING_INTERVAL = int(body["learning_interval"]) * 60
    if "learning_samples" in body:
        SAMPLES_PER_CYCLE = int(body["learning_samples"])
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


def predict_internal(text: str) -> dict:
    """Internal predict helper that returns a dict without requiring HTTP."""
    if cat_model is None or pri_model is None:
        raise Exception("Models not loaded")
    return predict(text, cat_model, pri_model)


@app.post("/predict", response_model=PredictResponse)
def predict_ticket(request: PredictRequest):
    if cat_model is None or pri_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    result = predict(request.text, cat_model, pri_model)
    return PredictResponse(**result)


@app.post("/chat")
def chat_with_sextafeira(body: dict):
    """Chat with Sexta-Feira - the local AI assistant (NO Claude API)."""
    import random

    message = body.get("message", "")
    msg_lower = message.lower()

    # Intent: Greeting (check FIRST to avoid misclassification)
    if any(kw in msg_lower for kw in ["oi", "ola", "olá", "hey", "bom dia", "boa tarde", "boa noite", "e ai", "eai"]):
        greetings = [
            "Ola! Eu sou a Sexta-Feira! Como posso ajudar?",
            "Oi! Tudo bem? Estou aqui pra ajudar com seus chamados!",
            "E ai! Sexta-Feira na area! O que precisa?",
            "Ola! Pronta pra classificar e resolver! O que manda?"
        ]
        return {"response": random.choice(greetings), "type": "greeting"}

    # Intent: Thank you
    if any(kw in msg_lower for kw in ["obrigado", "obrigada", "valeu", "thanks", "brigado"]):
        return {"response": "De nada! Estou sempre aqui pra ajudar. Precisa de mais alguma coisa?", "type": "greeting"}

    # Intent: Help / What can you do
    if any(kw in msg_lower for kw in ["ajuda", "help", "o que voce", "pode fazer", "quem e voce", "quem é", "quem voce e"]):
        return {
            "response": "Ola! Eu sou a **Sexta-Feira**, a IA local do TriageAI!\n\nPosso te ajudar com:\n- **Classificar chamados** - me envie um texto e eu classifico\n- **Ver metricas** - pergunte sobre minha precisao\n- **Aprendizado** - saiba como estou evoluindo\n- **Analisar tickets** - pergunte sobre categorias e prioridades\n- **Conversar** - sobre o sistema e chamados\n\nO que precisa?",
            "type": "help"
        }

    # Intent: Ask about stats/metrics/chamados
    if any(kw in msg_lower for kw in ["metricas", "accuracy", "precisao", "como esta", "como estao",
            "status", "modelo", "chamados", "analisados", "analise", "dashboard",
            "quantos ticket", "quantos chamado", "como vai", "desempenho", "performance"]):
        try:
            metrics = get_metrics()
            version = get_version()
            dataset_size = metrics.get('dataset_size', 0)
            acc = metrics.get('categoria_accuracy', 0) * 100
            f1 = metrics.get('categoria_f1', 0) * 100
            log = load_learning_log()
            cycles = len(log.get("cycles", []))
            return {
                "response": f"Aqui esta meu relatorio!\n\n"
                           f"**Modelo:** v{version.get('version', 0)}\n"
                           f"**Acuracia:** {acc:.1f}%\n"
                           f"**F1-Score:** {f1:.1f}%\n"
                           f"**Dataset:** {dataset_size} amostras\n"
                           f"**Ciclos de aprendizado:** {cycles}\n\n"
                           f"{'Estou com otima precisao!' if acc > 90 else 'Ainda tenho espaco pra melhorar.' if acc > 75 else 'Preciso de mais treino.'} "
                           f"Me mande textos de chamados que eu classifico em tempo real!",
                "type": "metrics",
                "data": metrics
            }
        except Exception:
            return {"response": "Ainda nao tenho metricas disponiveis. Preciso ser treinada primeiro!", "type": "info"}

    # Intent: Learning status
    if any(kw in msg_lower for kw in ["aprendizado", "treinamento", "learning", "treino", "aprendendo",
            "evoluindo", "evolucao", "ciclo", "autonomo"]):
        log = load_learning_log()
        cycles = len(log.get("cycles", []))
        corrections = log.get("total_corrections", 0)
        evaluated = log.get("total_evaluated", 0)
        recent = log.get("cycles", [])[-1] if log.get("cycles") else None
        last_acc = f"{recent['accuracy_vs_claude']}%" if recent else "N/A"
        return {
            "response": f"Meu aprendizado autonomo:\n\n"
                       f"**Ciclos completados:** {cycles}\n"
                       f"**Amostras avaliadas:** {evaluated}\n"
                       f"**Correcoes recebidas:** {corrections}\n"
                       f"**Ultima precisao vs Claude:** {last_acc}\n\n"
                       + ("Estou cada vez mais inteligente! A cada hora melhoro um pouco mais." if cycles > 5
                          else "Ainda estou no comeco, mas cada ciclo me deixa mais esperta!"),
            "type": "learning"
        }

    # Intent: Classify a text (explicit)
    if any(kw in msg_lower for kw in ["classific", "categoriz", "prioriz", "qual categoria", "que tipo",
            "classifique", "analise isso", "o que acha disso"]):
        text_to_classify = message
        for prefix in ["classifique:", "classifique", "analise:", "analise isso:", "analise"]:
            if msg_lower.startswith(prefix):
                text_to_classify = message[len(prefix):].strip()
                break
        try:
            result = predict_internal(text_to_classify)
            score = float(result['score']) * 100
            return {
                "response": f"Analisei e classifiquei como **{result['categoria']}** com prioridade **{result['prioridade']}** (confianca: {score:.0f}%).\n\n"
                           + (f"Tenho bastante confianca nessa classificacao!" if score > 70
                              else f"Confianca moderada. Talvez precise de mais contexto." if score > 40
                              else f"Nao estou muito segura. Pode me dar mais detalhes?"),
                "type": "classification",
                "data": result
            }
        except Exception:
            return {"response": "Ops, tive um problema ao classificar. Tenta de novo!", "type": "error"}

    # Default: Try to classify whatever text they sent
    try:
        result = predict_internal(message)
        ml_cat = result.get("categoria", "OUTROS")
        ml_pri = result.get("prioridade", "MEDIA")
        score = float(result.get('score', 0))

        config = load_config()
        use_claude = config.get("sexta_feira_use_claude", False)

        # If Claude learning is enabled, compare with Claude
        claude_insight = ""
        if use_claude:
            api_key = get_anthropic_key()
            if api_key:
                try:
                    client = anthropic.Anthropic(api_key=api_key)
                    claude_response = client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=200,
                        messages=[{
                            "role": "user",
                            "content": f"Classifique este chamado de suporte em UMA categoria (TECNICO, FINANCEIRO, COMERCIAL, ADMINISTRATIVO, SEGURANCA, OUTROS) e prioridade (CRITICA, ALTA, MEDIA, BAIXA). Responda SOMENTE com JSON: {{\"categoria\": \"X\", \"prioridade\": \"Y\"}}\n\nChamado: {message}"
                        }]
                    )
                    claude_text = claude_response.content[0].text.strip()
                    if claude_text.startswith("```"):
                        claude_text = claude_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    claude_result = json.loads(claude_text)
                    claude_cat = claude_result.get("categoria", ml_cat)
                    claude_pri = claude_result.get("prioridade", ml_pri)

                    # Compare and learn
                    if claude_cat != ml_cat:
                        # Add to dataset as correction
                        with open(DATA_PATH, "a", encoding="utf-8", newline="") as f:
                            writer = csv.writer(f)
                            writer.writerow([message.replace(",", ";"), claude_cat, claude_pri])
                        claude_insight = f"\n\n_Aprendi algo novo! Claude sugeriu **{claude_cat}** e eu disse **{ml_cat}**. Guardei pra melhorar._"
                        print(f"[SEXTA-FEIRA] Aprendeu: ML={ml_cat} vs Claude={claude_cat} -> Corrigiu para {claude_cat}")
                        # Use Claude's classification
                        ml_cat = claude_cat
                        ml_pri = claude_pri
                    else:
                        claude_insight = "\n\n_Conferi com Claude e concordamos na classificacao!_"
                except Exception as e:
                    print(f"[SEXTA-FEIRA] Claude comparison failed: {e}")

        if score > 0.7:
            confidence = "tenho bastante confianca"
        elif score > 0.4:
            confidence = "tenho confianca moderada"
        else:
            confidence = "nao estou muito segura"

        response = f"Analisando... {confidence} que isso seria **{ml_cat}** com prioridade **{ml_pri}** (score: {score*100:.0f}%)."
        response += claude_insight

        return {
            "response": response,
            "type": "classification",
            "data": {"categoria": ml_cat, "prioridade": ml_pri, "score": result.get("score", 0)}
        }
    except Exception:
        return {
            "response": "Desculpe, nao consegui processar sua mensagem. Tente perguntar sobre classificacao de chamados, metricas ou aprendizado!",
            "type": "error"
        }


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
            '.md', '.txt', '.cfg', '.ini', '.env', '.sql', '.kt', '.swift',
            '.properties', '.gradle', '.toml', '.sh', '.bat', '.dockerfile',
        }
        skip = {'node_modules/', '.git/', 'vendor/', 'dist/', 'build/', '.min.', 'package-lock',
                '.class', '.jar', '.war', 'target/', '__pycache__/', '.pyc'}
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

    # 4. Search by partial name match (e.g., "UserController" in text)
    for cn in class_names:
        cn_lower = cn.lower()
        for repo_path in file_tree:
            filename_lower = repo_path.split('/')[-1].split('.')[0].lower()
            if filename_lower == cn_lower and repo_path not in matched_set:
                matched.append(repo_path)
                matched_set.add(repo_path)

    # 5. Synonym matching - User/Usuario, Parcel/Encomenda, etc.
    #    For each base_name, also search common translations
    synonyms = {
        'usuario': ['user', 'usuario'],
        'user': ['user', 'usuario'],
        'encomenda': ['parcel', 'encomenda'],
        'parcel': ['parcel', 'encomenda'],
        'reclamacao': ['complaint', 'reclamacao'],
        'complaint': ['complaint', 'reclamacao'],
        'empresa': ['company', 'empresa', 'condominium', 'condo'],
        'pagamento': ['payment', 'pagamento'],
        'payment': ['payment', 'pagamento'],
    }
    extra_bases = set()
    for bn in base_names:
        bn_lower = bn.lower()
        if bn_lower in synonyms:
            for syn in synonyms[bn_lower]:
                extra_bases.add(syn.capitalize())
                extra_bases.add(syn)

    for base_name in extra_bases:
        for repo_path in file_tree:
            filename = repo_path.split('/')[-1].split('.')[0]
            if (filename.lower().startswith(base_name.lower()) or base_name.lower() in filename.lower()) \
                    and repo_path not in matched_set:
                if 'test' not in repo_path.lower() and 'spec/' not in repo_path.lower():
                    matched.append(repo_path)
                    matched_set.add(repo_path)

    # 6. Always include security config if ticket mentions auth/security
    security_keywords = ['autenticacao', 'autenticação', 'authentication', 'security', 'jwt',
                         'login', 'autorização', 'autorizacao', 'permission', 'role']
    ticket_combined = ' '.join(file_paths + class_names).lower()
    if any(kw in ticket_combined for kw in security_keywords):
        for repo_path in file_tree:
            fname = repo_path.split('/')[-1].lower()
            if ('security' in fname or 'auth' in fname or 'jwt' in fname) and repo_path not in matched_set:
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

## Critical Rules (MUST follow)
1. Read ALL provided files carefully. Understand the REAL field names, types, relationships, and packages.
2. If an Entity has @ManyToOne Empresa empresa, the JPA path is root.get("empresa").get("id"), NEVER root.get("empresaId")
3. If a Controller already has an endpoint, MODIFY it - do NOT create a duplicate in a new file. Duplicate routes crash the app.
4. Look at how authentication works in existing code (findByCpf vs findByUsername). Use the SAME pattern.
5. MODIFY existing files when possible. Only CREATE new files if the functionality truly doesn't exist yet.
6. Include ALL necessary changes: DTOs, Controllers, Services, Repositories, Specifications, Entities.
7. Use the EXACT class names, field names, import paths and types from the provided files.
8. If a DTO needs a new field, ADD it to the existing DTO file.
9. If a Controller needs authentication, ADD @PreAuthorize or SecurityContext checks to the EXISTING controller.
10. Keep all existing functionality intact. Only change what's needed for the fix.
11. ALL explanations MUST be in Brazilian Portuguese (pt-BR). Never write explanations in English.

## Response Format
Respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{{
  "fixes": [
    {{
      "file_path": "exact/path/from/repo/FileName.java",
      "action": "modify",
      "content": "complete file content with fixes applied",
      "explanation": "descricao breve em PORTUGUES do que foi alterado e por que"
    }}
  ]
}}

Rules for the response:
- file_path must match EXACTLY a path from the files listed above
- action "modify" = replace existing file content. Include the COMPLETE file content.
- action "create" = new file. ONLY if truly needed. Use correct package from existing files.
- NEVER create a file that duplicates an existing controller/service endpoint
- NEVER invent class names, method names or field names that don't exist in the codebase
- NEVER use root.get("fieldId") when the entity has @ManyToOne - use root.get("relation").get("id")
- Respond ONLY with the JSON object
- ALL "explanation" fields MUST be written in Brazilian Portuguese (pt-BR)"""

    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Use streaming to avoid timeout on large responses
        response_text = ""
        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=16000,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                response_text += text

        response_text = response_text.strip()

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

    # Step 2: ALWAYS ask Claude which files to read (Claude-first approach)
    # Claude sees the full file tree and the bug description, then decides what to read
    api_key = get_anthropic_key()
    target_files = []

    if api_key:
        print("Asking Claude to identify ALL files needed for the fix...")
        try:
            client = anthropic.Anthropic(api_key=api_key)
            # Send full file tree (just paths) to Claude
            tree_text = "\n".join(file_tree)
            identify_prompt = f"""You are analyzing a codebase to fix a bug. Here is the complete file tree of the repository:

{tree_text}

Here is the bug report:
Title: {request.ticket_title}
Description: {request.ticket_description}

List ALL files that need to be READ to understand and fix this bug. Include:
1. Files explicitly mentioned in the bug report
2. Entity/Model files related to the affected modules
3. Controller files that handle the affected endpoints
4. Service files with the business logic
5. Repository/DAO files
6. DTO/Request/Response files
7. Security/Auth configuration files (if the bug involves authentication)
8. Specification/Filter files
9. Any other file needed to understand the full context

Return ONLY a JSON array of file paths (strings), nothing else. Example:
["path/to/File1.java", "path/to/File2.java"]

Be thorough - it's better to include too many files than to miss one that's needed for the fix."""

            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": identify_prompt}]
            )
            response_text = msg.content[0].text.strip()
            if response_text.startswith("```"):
                response_text = re.sub(r'^```\w*\n?', '', response_text)
                response_text = re.sub(r'\n?```$', '', response_text)

            suggested = json.loads(response_text)
            # Validate paths exist in tree
            tree_set = set(file_tree)
            target_files = [f for f in suggested if f in tree_set]
            print(f"Claude identified {len(target_files)} files to read")
        except Exception as e:
            print(f"Claude file identification failed: {e}")

    # Fallback: use regex + keyword matching if Claude didn't work
    if not target_files:
        print("Falling back to regex + keyword file matching...")
        mentioned_paths = extract_file_paths_from_text(ticket_text)
        mentioned_classes = extract_class_names_from_text(ticket_text)
        target_files = find_files_in_tree(file_tree, mentioned_paths, mentioned_classes)

    if not target_files:
        target_files = score_files_fallback(file_tree, ticket_text)

    # Fetch content of up to 30 files
    target_files = target_files[:30]
    print(f"Final target files for analysis ({len(target_files)}): {target_files}")

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


# ===== TICKET ENRICHMENT =====

@app.post("/enrich-ticket")
def enrich_ticket(body: dict):
    text = body.get("text", "")
    sistema = body.get("sistema", "")

    # 1. Classify with ML model
    prediction = None
    try:
        pred_response = predict_internal(text)
        prediction = {
            "categoria": pred_response.get("categoria", "OUTROS"),
            "prioridade": pred_response.get("prioridade", "MEDIA"),
            "score": pred_response.get("score", 0)
        }
    except:
        prediction = {"categoria": "OUTROS", "prioridade": "MEDIA", "score": 0}

    # 2. Enrich with Claude
    api_key = get_anthropic_key()
    if not api_key:
        # Fallback without Claude
        return {
            "classificacao": prediction,
            "descricaoEnriquecida": text,
            "perguntas": [
                "Qual mensagem de erro aparece exatamente?",
                "Desde quando o problema ocorre?",
                "O problema afeta todos os usuarios ou apenas alguns?",
                "Quais passos voce seguiu antes do problema acontecer?"
            ],
            "sugestoes": [
                "Adicione a mensagem de erro exata",
                "Descreva os passos para reproduzir o problema",
                "Indique o impacto no negocio"
            ],
            "impacto": "medio",
            "passosReproduzir": [],
            "componentesAfetados": []
        }

    try:
        client = anthropic.Anthropic(api_key=api_key)

        sistema_context = f"\nSistema/Ambiente: {sistema}" if sistema else ""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Voce e um analista de suporte tecnico experiente. Analise este chamado e ajude a enriquece-lo.

Titulo/Descricao do chamado: "{text}"{sistema_context}
Classificacao ML: Categoria={prediction['categoria']}, Prioridade={prediction['prioridade']}

Categorias possiveis: TECNICO, FINANCEIRO, COMERCIAL, ADMINISTRATIVO, SEGURANCA, OUTROS
Prioridades possiveis: CRITICA, ALTA, MEDIA, BAIXA

Retorne um JSON valido (sem markdown, sem ```json) com:

{{
  "categoria": "a categoria mais adequada das opcoes acima baseada no conteudo real do chamado",
  "prioridade": "a prioridade mais adequada das opcoes acima",
  "descricaoEnriquecida": "Reescreva a descricao com mais detalhes tecnicos, mantendo o sentido original mas adicionando estrutura e clareza. Em portugues.",
  "perguntas": ["lista de 2-4 perguntas especificas que ajudariam a detalhar melhor o problema. Em portugues."],
  "sugestoes": ["lista de 2-3 informacoes que estao faltando na descricao. Em portugues."],
  "impacto": "baixo|medio|alto|critico",
  "impactoJustificativa": "justificativa curta do impacto em portugues",
  "passosReproduzir": ["lista de passos para reproduzir se aplicavel, ou lista vazia"],
  "componentesAfetados": ["lista de componentes/modulos/servicos que podem estar afetados"]
}}

Responda APENAS com o JSON, sem texto adicional."""
            }]
        )

        result_text = response.content[0].text.strip()
        # Clean up potential markdown wrapping
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1] if "\n" in result_text else result_text
            result_text = result_text.rsplit("```", 1)[0]

        enriched = json.loads(result_text)
        # Use Claude's classification if available, fallback to ML
        claude_cat = enriched.pop("categoria", prediction["categoria"])
        claude_pri = enriched.pop("prioridade", prediction["prioridade"])
        enriched["classificacao"] = {
            "categoria": claude_cat if claude_cat in ["TECNICO", "FINANCEIRO", "COMERCIAL", "ADMINISTRATIVO", "SEGURANCA", "OUTROS"] else prediction["categoria"],
            "prioridade": claude_pri if claude_pri in ["CRITICA", "ALTA", "MEDIA", "BAIXA"] else prediction["prioridade"],
            "score": prediction["score"]
        }
        return enriched

    except Exception as e:
        print(f"Enrich failed: {e}")
        return {
            "classificacao": prediction,
            "descricaoEnriquecida": text,
            "perguntas": [
                "Qual mensagem de erro aparece?",
                "Desde quando o problema ocorre?",
                "O problema afeta todos os usuarios?",
                "Quais passos voce seguiu antes do problema?"
            ],
            "sugestoes": ["Adicione mais detalhes tecnicos", "Descreva o impacto no negocio"],
            "impacto": "medio",
            "passosReproduzir": [],
            "componentesAfetados": []
        }


@app.post("/refine-ticket")
def refine_ticket(body: dict):
    text = body.get("text", "")
    respostas = body.get("respostas", [])  # list of {pergunta, resposta}
    descricao_atual = body.get("descricaoAtual", "")

    api_key = get_anthropic_key()
    if not api_key:
        # Fallback: just append answers to description
        extra = "\n".join([f"- {r.get('pergunta', '')}: {r.get('resposta', '')}" for r in respostas])
        return {"descricaoEnriquecida": f"{descricao_atual}\n\nInformacoes adicionais:\n{extra}"}

    try:
        client = anthropic.Anthropic(api_key=api_key)

        respostas_text = "\n".join([f"Pergunta: {r.get('pergunta', '')}\nResposta: {r.get('resposta', '')}" for r in respostas])

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": f"""Reescreva esta descricao de chamado incorporando as respostas do usuario.

Descricao atual:
{descricao_atual}

Respostas adicionais do usuario:
{respostas_text}

Gere uma descricao completa e bem estruturada em portugues que incorpore todas as informacoes.
Retorne APENAS um JSON: {{"descricaoEnriquecida": "texto completo aqui"}}
Sem markdown, sem ```."""
            }]
        )

        result_text = response.content[0].text.strip()
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1]
            result_text = result_text.rsplit("```", 1)[0]

        return json.loads(result_text)
    except Exception as e:
        print(f"Refine failed: {e}")
        extra = "\n".join([f"- {r.get('pergunta', '')}: {r.get('resposta', '')}" for r in respostas])
        return {"descricaoEnriquecida": f"{descricao_atual}\n\nInformacoes adicionais:\n{extra}"}


# ============================================================
#  AUTONOMOUS LEARNING LOOP - ML <-> Claude conversation
# ============================================================

LEARNING_LOG_PATH = os.path.join(os.path.dirname(__file__), 'data', 'learning_log.json')
LEARNING_INTERVAL = 3600  # 1 hour
SAMPLES_PER_CYCLE = 50
learning_running = False
learning_stats = {"cycles": 0, "corrections": 0, "last_run": None, "last_accuracy": 0}


def load_learning_log():
    if os.path.exists(LEARNING_LOG_PATH):
        with open(LEARNING_LOG_PATH, "r") as f:
            return json.load(f)
    return {"cycles": [], "total_corrections": 0, "total_evaluated": 0}


def save_learning_log(log):
    os.makedirs(os.path.dirname(LEARNING_LOG_PATH), exist_ok=True)
    with open(LEARNING_LOG_PATH, "w") as f:
        json.dump(log, f, indent=2, default=str)


def run_learning_cycle():
    """ML e Claude conversam: Claude gera chamados, ML classifica, divergencias viram treino."""
    global cat_model, pri_model, learning_stats

    api_key = get_anthropic_key()
    if not api_key:
        print("[LEARNING] Sem API key do Claude. Pulando ciclo.")
        return {"status": "skipped", "reason": "no_api_key"}

    if cat_model is None:
        print("[LEARNING] Modelos nao carregados. Pulando ciclo.")
        return {"status": "skipped", "reason": "no_models"}

    print(f"[LEARNING] Iniciando ciclo em {datetime.now().isoformat()}")

    # Step 1: Claude gera chamados realistas e classifica
    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": f"""Gere {SAMPLES_PER_CYCLE} chamados de suporte tecnico realistas em portugues brasileiro.
Varie entre: problemas tecnicos de microservicos; erros de banco de dados; falhas de API;
problemas financeiros como boletos e pagamentos; questoes comerciais de precos e planos;
tarefas administrativas; vulnerabilidades de seguranca; e outros.

Classifique cada um com:
- categoria: TECNICO ou FINANCEIRO ou COMERCIAL ou ADMINISTRATIVO ou SEGURANCA ou OUTROS
- prioridade: CRITICA ou ALTA ou MEDIA ou BAIXA

Responda SOMENTE com JSON array valido. Cada item:
{{"texto": "descricao do chamado sem virgulas", "categoria": "CATEGORIA", "prioridade": "PRIORIDADE"}}

Use ponto-e-virgula dentro dos textos em vez de virgula."""
            }]
        )

        result_text = response.content[0].text.strip()
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1]
            result_text = result_text.rsplit("```", 1)[0].strip()
        claude_samples = json.loads(result_text)
    except Exception as e:
        print(f"[LEARNING] Erro ao gerar amostras: {e}")
        return {"status": "error", "reason": str(e)}

    # Step 2: ML classifica os mesmos textos e compara
    corrections = []
    agreements = 0

    for sample in claude_samples:
        texto = sample.get("texto", "")
        claude_cat = sample.get("categoria", "OUTROS")
        claude_pri = sample.get("prioridade", "MEDIA")
        if not texto:
            continue

        try:
            ml_result = predict_internal(texto)
            ml_cat = ml_result.get("categoria", "OUTROS")
        except Exception:
            ml_cat = "OUTROS"

        if ml_cat == claude_cat:
            agreements += 1
        else:
            corrections.append({
                "texto": texto.replace(",", ";"),
                "categoria": claude_cat,
                "prioridade": claude_pri
            })

    # Step 3: Adiciona correcoes ao dataset
    if corrections:
        with open(DATA_PATH, "a", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            for c in corrections:
                writer.writerow([c["texto"], c["categoria"], c["prioridade"]])
        print(f"[LEARNING] {len(corrections)} correcoes adicionadas ao dataset")

    # Step 4: Re-treina se teve correcoes suficientes
    retrained = False
    if len(corrections) >= 5:
        print("[LEARNING] Re-treinando modelo...")
        with retrain_lock:
            try:
                train(DATA_PATH)
                new_cat, new_pri = load_models()
                cat_model = new_cat
                pri_model = new_pri
                retrained = True
            except Exception as e:
                print(f"[LEARNING] Erro no re-treino: {e}")

    # Step 5: Log
    total = agreements + len(corrections)
    accuracy = agreements / total if total > 0 else 0
    cycle_result = {
        "timestamp": datetime.now().isoformat(),
        "evaluated": total,
        "agreements": agreements,
        "corrections": len(corrections),
        "accuracy_vs_claude": round(accuracy * 100, 1),
        "retrained": retrained
    }

    log = load_learning_log()
    log["cycles"].append(cycle_result)
    log["total_corrections"] += len(corrections)
    log["total_evaluated"] += total
    save_learning_log(log)

    learning_stats.update({
        "cycles": learning_stats["cycles"] + 1,
        "corrections": learning_stats["corrections"] + len(corrections),
        "last_run": datetime.now().isoformat(),
        "last_accuracy": round(accuracy * 100, 1)
    })

    print(f"[LEARNING] Ciclo completo: {agreements}/{total} concordaram ({accuracy:.0%}), {len(corrections)} correcoes, re-treinou={retrained}")
    return cycle_result


def learning_loop_thread():
    """Thread que roda ciclos de aprendizado a cada hora."""
    global learning_running
    learning_running = True
    print(f"[LEARNING] Aprendizado autonomo iniciado (intervalo: {LEARNING_INTERVAL}s)")
    time.sleep(60)  # Espera 1 min apos startup
    while learning_running:
        try:
            run_learning_cycle()
        except Exception as e:
            print(f"[LEARNING] Erro no ciclo: {e}")
        for _ in range(LEARNING_INTERVAL):
            if not learning_running:
                break
            time.sleep(1)


_learning_thread = None


def start_learning():
    global _learning_thread
    config = load_config()
    if config.get("auto_learning_enabled", True):
        _learning_thread = threading.Thread(target=learning_loop_thread, daemon=True)
        _learning_thread.start()


def stop_learning():
    global learning_running
    learning_running = False


@app.get("/learning/status")
def learning_status():
    log = load_learning_log()
    recent = log.get("cycles", [])[-10:]
    return {
        "running": learning_running,
        "stats": learning_stats,
        "total_cycles": len(log.get("cycles", [])),
        "total_corrections": log.get("total_corrections", 0),
        "total_evaluated": log.get("total_evaluated", 0),
        "recent_cycles": recent
    }


@app.post("/learning/run-now")
def learning_run_now():
    result = run_learning_cycle()
    return result


@app.post("/learning/toggle")
def learning_toggle(body: dict):
    global learning_running
    enabled = body.get("enabled", True)
    config = load_config()
    config["auto_learning_enabled"] = enabled
    save_config_file(config)

    if enabled and not learning_running:
        start_learning()
        return {"message": "Aprendizado autonomo ativado", "running": True}
    elif not enabled:
        stop_learning()
        return {"message": "Aprendizado autonomo desativado", "running": False}
    return {"running": learning_running}
