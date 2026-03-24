package com.triageai.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/collection")
@Tag(name = "Documentacao", description = "Exportacao de collections e documentacao da API")
public class CollectionController {

    @GetMapping("/postman")
    @Operation(summary = "Exportar collection Postman", description = "Gera collection Postman v2.1 completa com todos os endpoints, exemplos e autenticacao configurada. Parametro env define o ambiente: local, dev, staging, prod.")
    public ResponseEntity<?> exportPostman(@RequestParam(defaultValue = "local") String env) {
        String baseUrl = switch (env) {
            case "prod", "producao" -> "https://api.triageai.com";
            case "staging" -> "https://staging.triageai.com";
            case "dev" -> "http://dev.triageai.com:8080";
            default -> "http://localhost:8080";
        };

        Map<String, Object> collection = new LinkedHashMap<>();

        // Info
        collection.put("info", Map.of(
                "name", "TriageAI API - " + env.toUpperCase(),
                "_postman_id", UUID.randomUUID().toString(),
                "description", "TriageAI - Sistema inteligente de classificacao e priorizacao automatica de chamados com IA (NLP).\n\n" +
                        "## Como usar\n" +
                        "1. Faca login em POST /api/auth/login para obter o token JWT\n" +
                        "2. Use o token no header Authorization: Bearer {token}\n" +
                        "3. Para integracoes externas (API v1), gere uma API Key em POST /api/api-keys e envie no header X-API-Key\n\n" +
                        "## Fluxo principal\n" +
                        "1. Criar chamado -> IA classifica automaticamente categoria e prioridade\n" +
                        "2. Se TECNICO + auto-fix ativo -> IA analisa codigo e cria PR\n" +
                        "3. Reviewer aprova -> ticket resolvido\n\n" +
                        "## Usuarios padrao\n" +
                        "- admin@triageai.com / admin123\n" +
                        "- agente@triageai.com / agente123\n\n" +
                        "Ambiente: " + env,
                "schema", "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        ));

        // Variables
        collection.put("variable", List.of(
                Map.of("key", "baseUrl", "value", baseUrl, "type", "string"),
                Map.of("key", "token", "value", "", "type", "string"),
                Map.of("key", "apiKey", "value", "", "type", "string")
        ));

        // Auth
        collection.put("auth", Map.of(
                "type", "bearer",
                "bearer", List.of(Map.of("key", "token", "value", "{{token}}", "type", "string"))
        ));

        // Items (folders)
        List<Object> items = new ArrayList<>();

        // 1. Auth folder
        items.add(createFolder("Autenticacao", List.of(
                createRequest("POST", "Login", "{{baseUrl}}/api/auth/login",
                        "{\"email\": \"admin@triageai.com\", \"password\": \"admin123\"}",
                        "Autentica o usuario no sistema e retorna um token JWT valido por 24h. Use este token no header Authorization: Bearer {token} para acessar endpoints protegidos. Usuarios padrao: admin@triageai.com/admin123, agente@triageai.com/agente123"),
                createRequest("POST", "Registrar", "{{baseUrl}}/api/register",
                        "{\"nomeEmpresa\": \"Minha Empresa\", \"documento\": \"12345678000190\", \"nomeUsuario\": \"Admin\", \"email\": \"admin@empresa.com\", \"senha\": \"123456\", \"plano\": \"FREE\"}",
                        "Cadastra nova empresa e usuario administrador. Valida CPF (11 digitos) ou CNPJ (14 digitos). Retorna token JWT para acesso imediato. Planos disponiveis: FREE, PRO, BUSINESS, BUSINESS_CLAUDE, ENTERPRISE.")
        )));

        // 2. Tickets folder
        items.add(createFolder("Tickets", List.of(
                createRequest("GET", "Listar tickets", "{{baseUrl}}/api/tickets", null,
                        "Lista todos os chamados com paginacao (20 por pagina). Filtros opcionais via query params: status (ABERTO, EM_ANDAMENTO, CODE_REVIEW, RESOLVIDO, FECHADO), prioridade (CRITICA, ALTA, MEDIA, BAIXA), categoria (TECNICO, FINANCEIRO, COMERCIAL, SUPORTE, OUTROS). Exemplo: ?status=ABERTO&page=0&size=10"),
                createRequest("GET", "Buscar ticket", "{{baseUrl}}/api/tickets/1", null,
                        "Busca um chamado pelo ID com detalhes completos: titulo, descricao, categoria, prioridade, status, score da IA e informacoes do PR (URL, branch, status, resumo) se existir."),
                createRequest("POST", "Criar ticket", "{{baseUrl}}/api/tickets",
                        "{\"titulo\": \"Sistema fora do ar\", \"descricao\": \"O sistema nao esta respondendo\"}",
                        "Cria um novo chamado. A IA classifica automaticamente a categoria (TECNICO, FINANCEIRO, etc.) e prioridade (CRITICA, ALTA, MEDIA, BAIXA) baseado no texto do titulo e descricao. Retorna o ticket criado com a classificacao."),
                createRequest("PUT", "Alterar status", "{{baseUrl}}/api/tickets/1/status",
                        "{\"status\": \"EM_ANDAMENTO\"}",
                        "Altera o status do chamado. Status disponiveis: ABERTO, EM_ANDAMENTO, CODE_REVIEW, RESOLVIDO, FECHADO. O fluxo tipico e: ABERTO -> EM_ANDAMENTO -> CODE_REVIEW -> RESOLVIDO -> FECHADO."),
                createRequest("PUT", "Feedback IA", "{{baseUrl}}/api/tickets/1/feedback",
                        "{\"categoria\": \"TECNICO\", \"prioridade\": \"ALTA\"}",
                        "Envia correcao da classificacao da IA para re-treino do modelo. Informe a categoria e prioridade corretas. O feedback melhora a precisao do modelo para classificacoes futuras."),
                createRequest("PUT", "Reclassificar", "{{baseUrl}}/api/tickets/1/reclassify", null,
                        "Reclassifica o chamado usando o modelo de IA mais recente. Util apos re-treino do modelo ou quando a classificacao original parece incorreta. Retorna classificacao anterior e nova.")
        )));

        // 3. API v1 (External)
        items.add(createFolder("API v1 (Integracoes)", List.of(
                createRequestWithApiKey("POST", "Classificar texto", "{{baseUrl}}/api/v1/classify",
                        "{\"text\": \"Sistema fora do ar nao consigo acessar\"}",
                        "Classifica um texto livre retornando categoria, prioridade e score de confianca da IA. Use para pre-classificar tickets antes de criar ou para integrar com sistemas externos. Retorna: categoria (TECNICO, FINANCEIRO, etc.), prioridade (CRITICA, ALTA, MEDIA, BAIXA), score (0-1) e model_version."),
                createRequestWithApiKey("POST", "Criar ticket via API", "{{baseUrl}}/api/v1/tickets",
                        "{\"titulo\": \"Erro no login\", \"descricao\": \"Usuarios reportam erro 500\"}",
                        "Cria um ticket com classificacao automatica via API externa. Ideal para integrar Jira, Zendesk, Freshdesk ou qualquer sistema. Envie titulo e descricao, a IA classifica automaticamente. Retorna: id, titulo, categoria, prioridade, status, ai_score, created_at."),
                createRequestWithApiKey("GET", "Consultar ticket", "{{baseUrl}}/api/v1/tickets/1", null,
                        "Consulta detalhes completos de um ticket via API. Retorna: id, titulo, descricao, categoria, prioridade, status, ai_score, created_at. Se houver PR: pr_url, pr_status, pr_branch, pr_summary."),
                createRequestWithApiKey("POST", "Auto-fix via API", "{{baseUrl}}/api/v1/tickets/1/auto-fix",
                        "{\"repoConfigId\": 1, \"branchType\": \"fix\"}",
                        "Executa auto-fix via API: IA analisa o repositorio, cria branch (fix/bugfix/hotfix/feat), gera correcao de codigo e abre Pull Request. Parametros opcionais: repoConfigId (ID do repo configurado), branchType (fix, bugfix, hotfix, feat), branchName (nome customizado da branch)."),
                createRequestWithApiKey("POST", "Webhook Jira", "{{baseUrl}}/api/v1/webhooks/jira",
                        "{\"issue\": {\"key\": \"PROJ-123\", \"fields\": {\"summary\": \"Bug no login\", \"description\": \"Erro 500\"}}}",
                        "Recebe webhook do Jira quando um ticket e criado/atualizado. Configure no Jira: Settings > System > Webhooks > Adicionar URL + header X-API-Key. O payload padrao do Jira e processado automaticamente extraindo summary e description do issue."),
                createRequestWithApiKey("POST", "Webhook Zendesk", "{{baseUrl}}/api/v1/webhooks/zendesk",
                        "{\"id\": \"12345\", \"subject\": \"Problema no pagamento\", \"description\": \"Nao consigo pagar\"}",
                        "Recebe webhook do Zendesk. Configure: Admin Center > Apps and integrations > Webhooks > HTTP endpoint. Campos esperados: id (ID do ticket no Zendesk), subject (assunto), description (descricao). Retorna classificacao da IA."),
                createRequestWithApiKey("POST", "Webhook Generico", "{{baseUrl}}/api/v1/webhooks/generic",
                        "{\"title\": \"Erro no sistema\", \"description\": \"Descricao do problema\"}",
                        "Webhook generico compativel com qualquer plataforma. Aceita dois formatos: {title, description} ou {subject, body}. Use para integrar ServiceNow, Freshdesk, ou qualquer sistema que envie POST com JSON. Pelo menos um campo de titulo ou descricao deve ser preenchido."),
                createRequestWithApiKey("GET", "Health check", "{{baseUrl}}/api/v1/health", null,
                        "Verifica se a API esta respondendo. Retorna status (ok), service (TriageAI), version e timestamp. Use para monitoramento e health checks de integracoes.")
        )));

        // 4. Git Integration
        items.add(createFolder("Git Integration", List.of(
                createRequest("POST", "Auto-fix ticket", "{{baseUrl}}/api/git/auto-fix/1?repoConfigId=1&branchType=auto", null,
                        "Executa auto-fix para um ticket: IA analisa o codigo do repositorio, cria branch, gera correcao e abre Pull Request. Parametros: repoConfigId (obrigatorio), branchType (fix/bugfix/hotfix/feat/refactor/docs/chore, padrao: fix), branchName (opcional). Retorna URL do PR e resumo das alteracoes."),
                createRequest("DELETE", "Apagar PR/Branch", "{{baseUrl}}/api/git/auto-fix/1", null,
                        "Desfaz o auto-fix: fecha o PR no provedor Git (GitHub/GitLab/Bitbucket), deleta a branch criada e reseta o ticket para status ABERTO. Use quando a correcao gerada nao e satisfatoria."),
                createRequest("POST", "Review PR", "{{baseUrl}}/api/git/review/1",
                        "{\"action\": \"APPROVE\", \"comment\": \"LGTM\"}",
                        "Envia review para o PR do ticket. Actions: APPROVE (aprova e move ticket para CODE_REVIEW) ou REQUEST_CHANGES (solicita alteracoes com comentario). O comment e opcional para APPROVE e recomendado para REQUEST_CHANGES."),
                createRequest("GET", "Listar colaboradores", "{{baseUrl}}/api/git/collaborators/1", null,
                        "Lista colaboradores do repositorio configurado (por repoConfigId). Retorna username e avatar de cada colaborador. Use para selecionar reviewer antes de solicitar review.")
        )));

        // 5. Sistemas
        items.add(createFolder("Sistemas", List.of(
                createRequest("GET", "Listar sistemas", "{{baseUrl}}/api/sistemas", null,
                        "Lista todos os sistemas/ambientes cadastrados com configuracoes de branch mapping (qual branch usar para hotfix, bugfix, feat, etc.), reviewers por tipo e repositorio vinculado."),
                createRequest("POST", "Criar sistema", "{{baseUrl}}/api/sistemas",
                        "{\"nome\": \"ERP Principal\", \"repoConfigId\": 1, \"autoFixEnabled\": true}",
                        "Cria novo sistema/ambiente vinculado a um repositorio. Configure: nome, repoConfigId (ID do repo), autoFixEnabled (habilita auto-fix), defaultReviewer, e branch mapping por tipo (branchHotfix, branchBugfix, branchFix, branchFeat, branchRefactor, branchDocs, branchChore).")
        )));

        // 6. Config
        items.add(createFolder("Configuracao", List.of(
                createRequest("GET", "Ver config", "{{baseUrl}}/api/config", null,
                        "Retorna configuracoes atuais do servico de IA, incluindo se a chave Anthropic (Claude) esta configurada. Necessario para funcionalidades avancadas como enriquecimento de tickets e auto-fix com Claude."),
                createRequest("POST", "Salvar API Key Claude", "{{baseUrl}}/api/config",
                        "{\"anthropic_api_key\": \"sk-ant-api03-...\"}",
                        "Salva a chave da API Claude (Anthropic) no servico de IA. Necessaria para: enriquecimento de tickets com Claude, auto-fix avancado e analise de codigo. Obtenha sua chave em console.anthropic.com."),
                createRequest("GET", "Listar API Keys", "{{baseUrl}}/api/api-keys", null,
                        "Lista todas as API Keys ativas para integracoes externas. Exibe: id, nome, prefixo (trai_xxxx...), data de criacao e ultimo uso. A chave completa nao e exibida por seguranca."),
                createRequest("POST", "Criar API Key", "{{baseUrl}}/api/api-keys",
                        "{\"name\": \"Jira Production\"}",
                        "Gera uma nova API Key com prefixo trai_. IMPORTANTE: a chave completa e retornada apenas nesta resposta - salve-a imediatamente. Use no header X-API-Key para acessar endpoints /api/v1/* (classificacao, webhooks, auto-fix via API)."),
                createRequest("DELETE", "Revogar API Key", "{{baseUrl}}/api/api-keys/1", null,
                        "Revoga (desativa) uma API Key pelo ID. Requisicoes usando esta chave passam a retornar 401 Unauthorized. Acao irreversivel - sera necessario criar uma nova chave.")
        )));

        // 7. Admin
        items.add(createFolder("Admin", List.of(
                createRequest("GET", "Stats admin", "{{baseUrl}}/api/admin/stats", null,
                        "Dashboard administrativo com metricas: total de empresas (ativas/inativas), total de usuarios, total de tickets, receita mensal, distribuicao por plano (FREE/PRO/BUSINESS/etc.), tickets criados hoje e na semana, e ultimas 5 empresas cadastradas."),
                createRequest("GET", "Listar empresas", "{{baseUrl}}/api/admin/empresas", null,
                        "Lista todas as empresas cadastradas com: nome, documento (CPF/CNPJ), email, telefone, plano, status ativo/inativo, limites do plano (tickets/mes, usuarios, sistemas, analises Claude), preco mensal e total de usuarios."),
                createRequest("POST", "Criar empresa", "{{baseUrl}}/api/admin/empresas",
                        "{\"nome\": \"Nova Empresa\", \"documento\": \"12345678000190\", \"email\": \"contato@empresa.com\", \"plano\": \"PRO\"}",
                        "Cria nova empresa (admin). Campos: nome, documento (CPF/CNPJ unico), tipoDocumento (CPF/CNPJ, padrao CNPJ), email, telefone, plano (FREE/PRO/BUSINESS/BUSINESS_CLAUDE/ENTERPRISE, padrao FREE). Limites sao configurados automaticamente pelo plano."),
                createRequest("GET", "Listar usuarios", "{{baseUrl}}/api/admin/usuarios", null,
                        "Lista todos os usuarios do sistema com nome, email, role (ADMIN/AGENT/CLIENT), empresa vinculada (ID e nome). Use para gestao global de usuarios."),
                createRequest("GET", "Listar planos", "{{baseUrl}}/api/admin/planos", null,
                        "Retorna definicao completa de todos os planos: nome, preco, limites (tickets, usuarios, sistemas, analises Claude), features e contagem de empresas em cada plano. Planos: FREE (R$0), PRO (R$99), BUSINESS (R$299), BUSINESS+CLAUDE (R$500), ENTERPRISE (R$999).")
        )));

        // 8. Profile
        items.add(createFolder("Perfil", List.of(
                createRequest("GET", "Meu perfil", "{{baseUrl}}/api/profile", null,
                        "Retorna dados do usuario logado: id, nome, email, role. Se vinculado a empresa, inclui: nome da empresa, documento, tipo documento, plano e limites (tickets/mes, usuarios, sistemas)."),
                createRequest("PUT", "Atualizar perfil", "{{baseUrl}}/api/profile",
                        "{\"name\": \"Novo Nome\"}",
                        "Atualiza dados do perfil do usuario logado. Campos opcionais: name (novo nome), password (nova senha). Envie apenas os campos que deseja alterar. Senha em branco e ignorada."),
                createRequest("PUT", "Upgrade plano", "{{baseUrl}}/api/profile/plano", null,
                        "Faz upgrade do plano da empresa para PREMIUM com limites ilimitados de tickets, usuarios e sistemas. Disponivel para o administrador da empresa.")
        )));

        collection.put("item", items);

        return ResponseEntity.ok(collection);
    }

    @GetMapping("/environments")
    @Operation(summary = "Listar ambientes", description = "Retorna lista de ambientes disponiveis (local, dev, staging, producao) com URLs base para configuracao do Postman.")
    public ResponseEntity<?> listEnvironments() {
        return ResponseEntity.ok(List.of(
                Map.of("name", "Local", "key", "local", "baseUrl", "http://localhost:8080"),
                Map.of("name", "Desenvolvimento", "key", "dev", "baseUrl", "http://dev.triageai.com:8080"),
                Map.of("name", "Staging", "key", "staging", "baseUrl", "https://staging.triageai.com"),
                Map.of("name", "Producao", "key", "prod", "baseUrl", "https://api.triageai.com")
        ));
    }

    private Map<String, Object> createFolder(String name, List<Object> items) {
        return Map.of("name", name, "item", items);
    }

    private Map<String, Object> createRequest(String method, String name, String url, String body, String description) {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("name", name);

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("method", method);
        request.put("url", Map.of("raw", url, "host", List.of(url)));
        request.put("description", description);

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("key", "Content-Type");
        header.put("value", "application/json");
        request.put("header", List.of(header));

        if (body != null) {
            request.put("body", Map.of("mode", "raw", "raw", body, "options", Map.of("raw", Map.of("language", "json"))));
        }

        req.put("request", request);
        return req;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> createRequestWithApiKey(String method, String name, String url, String body, String description) {
        Map<String, Object> req = createRequest(method, name, url, body, description);
        Map<String, Object> request = (Map<String, Object>) req.get("request");
        List<Map<String, Object>> headers = new ArrayList<>((List<Map<String, Object>>) request.get("header"));
        headers.add(Map.of("key", "X-API-Key", "value", "{{apiKey}}"));
        request.put("header", headers);
        // Override auth to use API key instead of bearer
        request.put("auth", Map.of("type", "apikey", "apikey", List.of(
                Map.of("key", "key", "value", "X-API-Key", "type", "string"),
                Map.of("key", "value", "value", "{{apiKey}}", "type", "string"),
                Map.of("key", "in", "value", "header", "type", "string")
        )));
        return req;
    }
}
