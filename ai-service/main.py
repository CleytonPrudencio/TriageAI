#!/usr/bin/env python3
"""TriageAI - AI Service for ticket classification."""

import os
import re
import csv
import threading
import base64
from contextlib import asynccontextmanager
from typing import Optional

import requests
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


def find_relevant_files(files: list[str], title: str, description: str) -> list[str]:
    """Find files most likely related to the ticket."""
    text = (title + " " + description).lower()

    # Extract keywords
    keywords = set()
    for word in re.findall(r'[a-zA-Z]+', text):
        if len(word) > 2:
            keywords.add(word.lower())

    # Map common Portuguese terms to file patterns
    term_to_files = {
        'tela': ['.html', '.jsx', '.tsx', '.vue', '.css', 'component'],
        'inicial': ['index', 'home', 'main', 'landing', 'app'],
        'pagina': ['.html', 'page', 'index', 'component'],
        'site': ['.html', '.css', '.js', 'index'],
        'estilo': ['.css', '.scss', 'style', 'theme'],
        'layout': ['.html', '.css', 'layout', 'header', 'footer', 'template'],
        'botao': ['.html', '.css', '.js', 'button', 'component'],
        'formulario': ['.html', 'form', 'contact', 'component'],
        'menu': ['.html', '.css', 'nav', 'header', 'menu', 'sidebar'],
        'imagem': ['.html', '.css', 'img', 'image', 'asset'],
        'login': ['login', 'auth', 'signin', 'security'],
        'cadastro': ['register', 'signup', 'cadastro', 'controller', 'service', 'form'],
        'erro': ['error', 'handler', 'exception', 'controller', 'service', '.java', '.py', '.js'],
        'erros': ['error', 'handler', 'exception', 'controller', 'service', '.java', '.py', '.js'],
        'api': ['api', 'service', 'controller', 'endpoint', 'route'],
        'banco': ['.sql', 'database', 'migration', 'model', 'repository', 'schema'],
        'config': ['.json', '.yaml', '.yml', '.env', 'config', 'properties'],
        # Domain terms PT -> EN file patterns
        'produto': ['produto', 'product', 'item', 'controller', 'service', 'model'],
        'produtos': ['produto', 'product', 'item', 'controller', 'service', 'model'],
        'estoque': ['estoque', 'stock', 'inventory', 'movimento', 'controller', 'service'],
        'categoria': ['categori', 'category', 'tipo', 'type', 'enum'],
        'categorias': ['categori', 'category', 'tipo', 'type', 'enum'],
        'valor': ['preco', 'price', 'valor', 'produto', 'product', 'model', 'service'],
        'usuario': ['user', 'usuario', 'auth', 'security', 'controller'],
        'venda': ['venda', 'sale', 'order', 'pedido', 'service', 'controller'],
        'pagamento': ['pagamento', 'payment', 'billing', 'financ'],
        'relatorio': ['relatorio', 'report', 'dashboard', 'stats'],
        'notificacao': ['notifica', 'notification', 'email', 'alert'],
        'permissao': ['permission', 'role', 'security', 'auth', 'access'],
        'movimentacao': ['movimento', 'movimenta', 'transaction', 'service', 'controller'],
        'adicionar': ['controller', 'service', 'form', 'create', 'add', 'post'],
        'remover': ['controller', 'service', 'delete', 'remove'],
        'atualizar': ['controller', 'service', 'update', 'put', 'edit'],
    }

    # Score files
    scored = []
    for f in files:
        fname = f.lower()
        score = 0

        # Direct keyword match in filename
        fname_parts = fname.replace("/", " ").replace("_", " ").replace("-", " ").replace(".", " ")
        for kw in keywords:
            if kw in fname_parts:
                score += 2

        # Term-based matching
        for term, patterns in term_to_files.items():
            if term in text:
                for pat in patterns:
                    if pat in fname:
                        score += 3

        # Boost main files
        if 'index' in fname:
            score += 2
        if fname.endswith('.html'):
            score += 1

        # Deprioritize tests/docs
        if 'test' in fname or 'spec' in fname or 'readme' in fname:
            score -= 3

        if score > 0:
            scored.append((f, score))

    # If no matches, return main files (index.html, main files, etc.)
    if not scored:
        fallback = []
        for f in files:
            fl = f.lower()
            if 'index' in fl or 'main' in fl or 'home' in fl or 'app' in fl:
                fallback.append(f)
        return fallback[:5]

    scored.sort(key=lambda x: -x[1])
    return [f for f, _ in scored[:5]]


def generate_fix(file_path: str, content: str, title: str, description: str) -> Optional[FileFix]:
    """Generate a fix based on ticket description and file type."""
    text = (title + " " + description).lower()
    ext = file_path.rsplit('.', 1)[-1] if '.' in file_path else ''

    # HTML fixes
    if ext == 'html':
        return generate_html_fix(file_path, content, text)

    # CSS fixes
    if ext in ('css', 'scss', 'sass', 'less'):
        return generate_css_fix(file_path, content, text)

    # JS/TS fixes
    if ext in ('js', 'ts', 'jsx', 'tsx'):
        return generate_js_fix(file_path, content, text)

    # Java fixes
    if ext == 'java':
        return generate_java_fix(file_path, content, text)

    # Python fixes
    if ext == 'py':
        return generate_python_fix(file_path, content, text)

    return None


def generate_html_fix(file_path: str, content: str, text: str) -> Optional[FileFix]:
    """Fix HTML files based on ticket description."""
    fixed = content
    explanations = []

    # Missing page / section
    if any(kw in text for kw in ['falta', 'faltando', 'criar', 'adicionar', 'nova', 'novo', 'inicial']):
        if '<body' in fixed:
            # Add a hero section / initial screen
            hero_section = """
    <!-- [TriageAI] Secao inicial adicionada -->
    <section id="hero" style="padding: 60px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 80vh; display: flex; align-items: center; justify-content: center;">
        <div style="max-width: 800px;">
            <h1 style="font-size: 3em; margin-bottom: 20px;">Bem-vindo ao nosso site</h1>
            <p style="font-size: 1.2em; opacity: 0.9; margin-bottom: 30px;">Solucoes inovadoras para o seu negocio</p>
            <a href="#contato" style="background: white; color: #667eea; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 1.1em;">Saiba Mais</a>
        </div>
    </section>"""
            # Insert after <body> tag
            body_match = re.search(r'(<body[^>]*>)', fixed)
            if body_match:
                insert_pos = body_match.end()
                fixed = fixed[:insert_pos] + hero_section + fixed[insert_pos:]
                explanations.append("Adicionada secao hero/inicial com titulo e call-to-action")

    # Missing title/header
    if any(kw in text for kw in ['titulo', 'header', 'cabecalho']):
        if '<header' not in fixed and '<body' in fixed:
            header = """
    <!-- [TriageAI] Header adicionado -->
    <header style="background: #333; color: white; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center;">
        <h1 style="margin: 0; font-size: 1.5em;">Site</h1>
        <nav>
            <a href="#" style="color: white; margin: 0 15px; text-decoration: none;">Home</a>
            <a href="#" style="color: white; margin: 0 15px; text-decoration: none;">Sobre</a>
            <a href="#" style="color: white; margin: 0 15px; text-decoration: none;">Contato</a>
        </nav>
    </header>"""
            body_match = re.search(r'(<body[^>]*>)', fixed)
            if body_match:
                insert_pos = body_match.end()
                fixed = fixed[:insert_pos] + header + fixed[insert_pos:]
                explanations.append("Adicionado header com navegacao")

    # Fix broken links / errors
    if any(kw in text for kw in ['erro', 'quebrado', 'broken', 'link', 'bug']):
        # Fix common HTML issues
        if '<meta charset' not in fixed and '<head' in fixed:
            fixed = fixed.replace('<head>', '<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">', 1)
            explanations.append("Adicionadas meta tags charset e viewport")

    # Responsiveness
    if any(kw in text for kw in ['responsivo', 'mobile', 'celular', 'responsiv']):
        if 'viewport' not in fixed and '<head' in fixed:
            fixed = fixed.replace('<head>', '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">', 1)
            explanations.append("Adicionada meta viewport para responsividade")

    # Footer
    if any(kw in text for kw in ['footer', 'rodape', 'rodapé']):
        if '<footer' not in fixed and '</body' in fixed:
            footer = """
    <!-- [TriageAI] Footer adicionado -->
    <footer style="background: #333; color: white; padding: 30px; text-align: center; margin-top: 40px;">
        <p>&copy; 2026 - Todos os direitos reservados</p>
    </footer>"""
            fixed = fixed.replace('</body>', footer + '\n</body>', 1)
            explanations.append("Adicionado footer ao site")

    if not explanations:
        return None

    return FileFix(
        filePath=file_path,
        originalCode=content,
        fixedCode=fixed,
        explanation="; ".join(explanations)
    )


def generate_css_fix(file_path: str, content: str, text: str) -> Optional[FileFix]:
    """Fix CSS files."""
    fixed = content
    explanations = []

    if any(kw in text for kw in ['responsivo', 'mobile', 'celular']):
        if '@media' not in fixed:
            fixed += """

/* [TriageAI] Media queries para responsividade */
@media (max-width: 768px) {
    body { padding: 10px; }
    .container { width: 100%; padding: 0 15px; }
    img { max-width: 100%; height: auto; }
    table { display: block; overflow-x: auto; }
}
"""
            explanations.append("Adicionadas media queries para dispositivos moveis")

    if any(kw in text for kw in ['estilo', 'visual', 'design', 'bonito', 'feio']):
        if 'font-family' not in fixed:
            fixed = """/* [TriageAI] Reset e estilos base */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
a { color: #667eea; text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; }

""" + fixed
            explanations.append("Adicionado reset CSS e estilos base")

    if not explanations:
        return None

    return FileFix(filePath=file_path, originalCode=content, fixedCode=fixed, explanation="; ".join(explanations))


def generate_js_fix(file_path: str, content: str, text: str) -> Optional[FileFix]:
    """Fix JavaScript/TypeScript files."""
    fixed = content
    explanations = []

    if any(kw in text for kw in ["erro", "error", "bug", "crash", "falha", "undefined"]):
        # Wrap main code in try-catch if not present
        if 'try' not in fixed and 'catch' not in fixed and len(fixed) > 50:
            fixed = f"try {{\n{fixed}\n}} catch (error) {{\n  console.error('[TriageAI] Erro capturado:', error);\n}}"
            explanations.append("Adicionado try-catch para captura de erros")

    if any(kw in text for kw in ["lento", "performance", "otimizar"]):
        if 'addEventListener' in fixed and 'DOMContentLoaded' not in fixed:
            fixed = f"document.addEventListener('DOMContentLoaded', function() {{\n{fixed}\n}});"
            explanations.append("Envolvido codigo em DOMContentLoaded para melhor performance")

    if not explanations:
        return None

    return FileFix(filePath=file_path, originalCode=content, fixedCode=fixed, explanation="; ".join(explanations))


def generate_java_fix(file_path: str, content: str, text: str) -> Optional[FileFix]:
    """Fix Java files."""
    lines = content.split("\n")
    fixed_lines = list(lines)
    explanations = []

    # Pattern 1: NullPointerException
    if any(kw in text for kw in ["null", "nullpointer", "nulo"]):
        for i, line in enumerate(lines):
            if re.search(r'\b\w+\.\w+\(', line) and "if " not in line and "//" not in line.strip()[:2]:
                var_match = re.match(r'(\s*)((\w+)\.\w+\(.*)', line)
                if var_match:
                    indent, var_name = var_match.group(1), var_match.group(3)
                    if var_name not in ('this', 'super', 'System', 'Math', 'String', 'log', 'return'):
                        fixed_lines[i] = f"{indent}if ({var_name} != null) {{\n{line}\n{indent}}}"
                        explanations.append(f"Verificacao de null para '{var_name}'")
                        break

    # Pattern 2: Error/Exception handling
    if any(kw in text for kw in ["erro", "error", "exception", "crash", "falha", "bug"]):
        # Add try-catch around methods that don't have it
        for i, line in enumerate(lines):
            if 'public ' in line and ('void ' in line or 'Response' in line or 'return' in lines[min(i+3, len(lines)-1)].strip()[:6] if i+3 < len(lines) else False):
                method_indent = re.match(r'(\s*)', line).group(1)
                body_indent = method_indent + "    "
                # Find the opening brace
                for j in range(i, min(i+3, len(lines))):
                    if '{' in lines[j]:
                        fixed_lines[j] = lines[j].replace('{', '{\n' + body_indent + 'try {')
                        # Find closing brace of method
                        brace_count = 0
                        for k in range(j, len(lines)):
                            brace_count += lines[k].count('{') - lines[k].count('}')
                            if brace_count == 0:
                                fixed_lines[k] = body_indent + '} catch (Exception e) {\n' + body_indent + '    // [TriageAI] Tratamento de erro adicionado\n' + body_indent + '    throw new RuntimeException("Erro ao processar: " + e.getMessage(), e);\n' + method_indent + '}'
                                explanations.append(f"Try-catch adicionado ao metodo para tratamento de erros")
                                break
                        break
                if explanations:
                    break

    # Pattern 3: Validation - add input validation to controller/service methods
    if any(kw in text for kw in ["cadastro", "adicionar", "criar", "salvar", "valor", "invalido"]):
        for i, line in enumerate(lines):
            if ('save(' in line or 'create(' in line or 'cadastr' in line.lower()) and '//' not in line.strip()[:2]:
                indent = re.match(r'(\s*)', line).group(1)
                # Add validation comment before save
                validation = f"{indent}// [TriageAI] Validacao de dados antes de salvar\n{indent}if (entity == null) throw new IllegalArgumentException(\"Dados invalidos para cadastro\");\n"
                fixed_lines[i] = validation + line
                explanations.append("Validacao de dados adicionada antes do cadastro/save")
                break

    # Pattern 4: Logging - add logging to service methods
    if any(kw in text for kw in ["erro", "log", "rastrear", "debug"]):
        added_log = False
        for i, line in enumerate(lines):
            if 'public ' in line and 'class ' not in line and not added_log:
                # Check if method has logging
                method_body = "\n".join(lines[i:min(i+20, len(lines))])
                if 'log.' not in method_body and 'logger.' not in method_body:
                    for j in range(i, min(i+3, len(lines))):
                        if '{' in lines[j]:
                            indent = re.match(r'(\s*)', lines[j]).group(1) + "    "
                            method_name = re.search(r'(\w+)\s*\(', line)
                            if method_name:
                                log_line = f'{indent}log.info("[TriageAI] Executando {method_name.group(1)}");\n'
                                fixed_lines[j] = lines[j] + '\n' + log_line
                                explanations.append(f"Log adicionado ao metodo {method_name.group(1)}")
                                added_log = True
                            break

    if not explanations:
        return None

    return FileFix(filePath=file_path, originalCode=content, fixedCode="\n".join(fixed_lines), explanation="; ".join(explanations))


def generate_python_fix(file_path: str, content: str, text: str) -> Optional[FileFix]:
    """Fix Python files."""
    fixed = content
    explanations = []

    if any(kw in text for kw in ["erro", "error", "bug", "crash"]):
        if 'try:' not in fixed and 'except' not in fixed and 'def ' in fixed:
            fixed = fixed + "\n\n# [TriageAI] TODO: Adicionar tratamento de erros nas funcoes acima\n"
            explanations.append("Sugerido tratamento de erros")

    if not explanations:
        return None

    return FileFix(filePath=file_path, originalCode=content, fixedCode=fixed, explanation="; ".join(explanations))


@app.post("/analyze-code", response_model=CodeAnalysisResponseModel)
def analyze_code(request: CodeAnalysisRequest):
    """Analyze repository code and suggest fixes based on ticket description."""
    print(f"Analyzing repo {request.repo_owner}/{request.repo_name} for ticket: {request.ticket_title}")

    # 1. Fetch file tree from repo
    files = fetch_repo_tree(
        request.repo_owner, request.repo_name,
        request.api_token, request.provider, request.default_branch
    )
    print(f"Found {len(files)} files in repo")

    if not files:
        return CodeAnalysisResponseModel(fixes=[])

    # 2. Find files most relevant to the ticket
    relevant = find_relevant_files(files, request.ticket_title, request.ticket_description)
    print(f"Relevant files: {relevant}")

    if not relevant:
        return CodeAnalysisResponseModel(fixes=[])

    # 3. Fetch content of relevant files and generate fixes
    fixes = []
    for file_path in relevant:
        content = fetch_file_content(
            request.repo_owner, request.repo_name,
            file_path, request.api_token, request.provider, request.default_branch
        )
        if content:
            fix = generate_fix(file_path, content, request.ticket_title, request.ticket_description)
            if fix:
                fixes.append(fix)
                print(f"Fix generated for {file_path}: {fix.explanation}")

    print(f"Total fixes: {len(fixes)}")
    return CodeAnalysisResponseModel(fixes=fixes)
