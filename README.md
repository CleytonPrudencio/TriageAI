# TriageAI

**Sistema Inteligente de Classificacao e Priorizacao Automatica de Chamados utilizando Tecnicas de Processamento de Linguagem Natural**

## Sobre

O TriageAI e um sistema completo de help desk que utiliza Inteligencia Artificial para classificar e priorizar chamados automaticamente. Alem disso, integra-se com repositorios Git (GitHub/GitLab/Bitbucket) para gerar correcoes automaticas via Pull Requests.

## Arquitetura

```
[Frontend Angular :4200] --> [Backend Spring Boot :8080] --> [AI Service Python :8000]
                                       |
                                       +--> [GitHub/GitLab/Bitbucket API]
```

| Camada | Tecnologia |
|---|---|
| Backend | Java 17+ / Spring Boot 3.2 / Spring Security (JWT) / H2 |
| IA | Python / FastAPI / scikit-learn (TF-IDF + Logistic Regression) |
| Frontend | Angular 17 / Angular Material |
| Infra | Docker / Docker Compose |

## Pre-requisitos

- **Java 17+** (JDK)
- **Python 3.10+**
- **Node.js 18+** (com npm)
- **Maven** (ou usar o wrapper `mvnw` incluso)

## Como Instalar e Rodar

### 1. Clonar o repositorio

```bash
git clone https://github.com/CleytonPrudencio/TriageAI.git
cd TriageAI
```

### 2. Servico de IA (Python)

```bash
cd ai-service
pip install -r requirements.txt
python train.py
python -m uvicorn main:app --reload --port 8000
```

> No Windows, use `py` em vez de `python` se necessario.

O servico fica disponivel em `http://localhost:8000`.

### 3. Backend (Java / Spring Boot)

Em outro terminal:

```bash
cd backend
./mvnw spring-boot:run
```

> No Windows: `mvnw.cmd spring-boot:run`
> Ou abra no IntelliJ e rode `TriageAiApplication.java`

O backend fica disponivel em `http://localhost:8080`.

### 4. Frontend (Angular)

Em outro terminal:

```bash
cd frontend
npm install
npx ng serve
```

O frontend fica disponivel em `http://localhost:4200`.

### Opcao alternativa: Docker

```bash
docker-compose up --build
```

Acesse em `http://localhost:4200`.

## Usuarios de Teste

| Email | Senha | Perfil |
|---|---|---|
| admin@triageai.com | admin123 | ADMIN |
| maria@triageai.com | agent123 | AGENTE |
| joao@triageai.com | agent123 | AGENTE |
| ana@empresa.com | client123 | CLIENTE |
| pedro@empresa.com | client123 | CLIENTE |

## Como Usar

### 1. Login
Acesse `http://localhost:4200` e faca login com um dos usuarios acima.

### 2. Criar Chamado
Va em **Novo Chamado**, preencha titulo e descricao. A IA classifica automaticamente a **categoria** e **prioridade**.

### 3. Corrigir Classificacao (Feedback)
No detalhe do chamado, use **Corrigir IA** para enviar a classificacao correta. A cada 10 feedbacks, o modelo re-treina automaticamente.

### 4. Auto-Fix (Integracao Git)
1. Va em **Repositorios** e configure um repo (GitHub token + owner/nome)
2. Abra um chamado TECNICO
3. Clique **Executar Auto-Fix**
4. O sistema cria branch, analisa codigo, commita fix e abre PR

### 5. Dashboard
Visualize metricas: total de chamados, distribuicao por categoria, prioridade e status.

## Endpoints da API

### Auth
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login (retorna JWT)

### Tickets
- `GET /api/tickets` - Listar (paginacao + filtros)
- `POST /api/tickets` - Criar (IA classifica)
- `PUT /api/tickets/{id}/feedback` - Corrigir classificacao
- `PUT /api/tickets/{id}/status` - Alterar status

### Dashboard
- `GET /api/dashboard/stats` - Estatisticas

### Git Integration
- `POST /api/git/auto-fix/{ticketId}` - Dispara auto-fix
- CRUD `/api/repo-configs` - Gerenciar repositorios

### AI Service (porta 8000)
- `POST /predict` - Classificar texto
- `POST /feedback` - Enviar correcao
- `POST /retrain` - Re-treinar modelo
- `POST /analyze-code` - Analisar codigo do repo
- `GET /health` - Health check

## Estrutura do Projeto

```
TriageAI/
├── backend/          # Java Spring Boot
├── ai-service/       # Python FastAPI + ML
├── frontend/         # Angular 17
├── docs/             # Apresentacao (gh-pages)
├── docker-compose.yml
└── README.md
```

## Licenca

MIT License
