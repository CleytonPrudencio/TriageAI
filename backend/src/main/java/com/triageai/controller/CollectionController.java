package com.triageai.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/collection")
public class CollectionController {

    @GetMapping("/postman")
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
                "description", "Collection completa da API TriageAI. Ambiente: " + env,
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
                        "Faz login e retorna JWT token"),
                createRequest("POST", "Registrar", "{{baseUrl}}/api/register",
                        "{\"nomeEmpresa\": \"Minha Empresa\", \"documento\": \"12345678000190\", \"nomeUsuario\": \"Admin\", \"email\": \"admin@empresa.com\", \"senha\": \"123456\", \"plano\": \"FREE\"}",
                        "Registra nova empresa e usuario")
        )));

        // 2. Tickets folder
        items.add(createFolder("Tickets", List.of(
                createRequest("GET", "Listar tickets", "{{baseUrl}}/api/tickets", null, "Lista todos os tickets"),
                createRequest("GET", "Buscar ticket", "{{baseUrl}}/api/tickets/1", null, "Busca ticket por ID"),
                createRequest("POST", "Criar ticket", "{{baseUrl}}/api/tickets",
                        "{\"titulo\": \"Sistema fora do ar\", \"descricao\": \"O sistema nao esta respondendo\"}",
                        "Cria ticket com classificacao automatica da IA"),
                createRequest("PUT", "Alterar status", "{{baseUrl}}/api/tickets/1/status",
                        "{\"status\": \"EM_ANDAMENTO\"}", "Altera status do ticket"),
                createRequest("PUT", "Feedback IA", "{{baseUrl}}/api/tickets/1/feedback",
                        "{\"categoria\": \"TECNICO\", \"prioridade\": \"ALTA\"}", "Envia correcao para a IA"),
                createRequest("PUT", "Reclassificar", "{{baseUrl}}/api/tickets/1/reclassify", null,
                        "Reclassifica ticket com modelo atual")
        )));

        // 3. API v1 (External)
        items.add(createFolder("API v1 (Integracoes)", List.of(
                createRequestWithApiKey("POST", "Classificar texto", "{{baseUrl}}/api/v1/classify",
                        "{\"text\": \"Sistema fora do ar nao consigo acessar\"}", "Classifica texto com IA"),
                createRequestWithApiKey("POST", "Criar ticket via API", "{{baseUrl}}/api/v1/tickets",
                        "{\"titulo\": \"Erro no login\", \"descricao\": \"Usuarios reportam erro 500\"}", "Cria ticket via API externa"),
                createRequestWithApiKey("GET", "Consultar ticket", "{{baseUrl}}/api/v1/tickets/1", null, "Consulta ticket via API"),
                createRequestWithApiKey("POST", "Auto-fix via API", "{{baseUrl}}/api/v1/tickets/1/auto-fix",
                        "{\"repoConfigId\": 1, \"branchType\": \"fix\"}", "Executa auto-fix via API"),
                createRequestWithApiKey("POST", "Webhook Jira", "{{baseUrl}}/api/v1/webhooks/jira",
                        "{\"issue\": {\"key\": \"PROJ-123\", \"fields\": {\"summary\": \"Bug no login\", \"description\": \"Erro 500\"}}}", "Webhook do Jira"),
                createRequestWithApiKey("POST", "Webhook Zendesk", "{{baseUrl}}/api/v1/webhooks/zendesk",
                        "{\"id\": \"12345\", \"subject\": \"Problema no pagamento\", \"description\": \"Nao consigo pagar\"}", "Webhook do Zendesk"),
                createRequestWithApiKey("POST", "Webhook Generico", "{{baseUrl}}/api/v1/webhooks/generic",
                        "{\"title\": \"Erro no sistema\", \"description\": \"Descricao do problema\"}", "Webhook generico"),
                createRequestWithApiKey("GET", "Health check", "{{baseUrl}}/api/v1/health", null, "Verifica status da API")
        )));

        // 4. Git Integration
        items.add(createFolder("Git Integration", List.of(
                createRequest("POST", "Auto-fix ticket", "{{baseUrl}}/api/git/auto-fix/1?repoConfigId=1&branchType=auto", null, "Executa auto-fix para um ticket"),
                createRequest("DELETE", "Apagar PR/Branch", "{{baseUrl}}/api/git/auto-fix/1", null, "Fecha PR e deleta branch"),
                createRequest("POST", "Review PR", "{{baseUrl}}/api/git/review/1",
                        "{\"action\": \"APPROVE\", \"comment\": \"LGTM\"}", "Aprova ou solicita alteracoes no PR"),
                createRequest("GET", "Listar colaboradores", "{{baseUrl}}/api/git/collaborators/1", null, "Lista colaboradores do repo")
        )));

        // 5. Sistemas
        items.add(createFolder("Sistemas", List.of(
                createRequest("GET", "Listar sistemas", "{{baseUrl}}/api/sistemas", null, "Lista todos os sistemas"),
                createRequest("POST", "Criar sistema", "{{baseUrl}}/api/sistemas",
                        "{\"nome\": \"ERP Principal\", \"repoConfigId\": 1, \"autoFixEnabled\": true}",
                        "Cria novo sistema/ambiente")
        )));

        // 6. Config
        items.add(createFolder("Configuracao", List.of(
                createRequest("GET", "Ver config", "{{baseUrl}}/api/config", null, "Retorna configuracoes atuais"),
                createRequest("POST", "Salvar API Key Claude", "{{baseUrl}}/api/config",
                        "{\"anthropic_api_key\": \"sk-ant-api03-...\"}", "Salva chave da API Claude"),
                createRequest("GET", "Listar API Keys", "{{baseUrl}}/api/api-keys", null, "Lista API keys criadas"),
                createRequest("POST", "Criar API Key", "{{baseUrl}}/api/api-keys",
                        "{\"name\": \"Jira Production\"}", "Gera nova API key"),
                createRequest("DELETE", "Revogar API Key", "{{baseUrl}}/api/api-keys/1", null, "Revoga uma API key")
        )));

        // 7. Admin
        items.add(createFolder("Admin", List.of(
                createRequest("GET", "Stats admin", "{{baseUrl}}/api/admin/stats", null, "Estatisticas administrativas"),
                createRequest("GET", "Listar empresas", "{{baseUrl}}/api/admin/empresas", null, "Lista todas as empresas"),
                createRequest("POST", "Criar empresa", "{{baseUrl}}/api/admin/empresas",
                        "{\"nome\": \"Nova Empresa\", \"documento\": \"12345678000190\", \"email\": \"contato@empresa.com\", \"plano\": \"PRO\"}", "Cria empresa"),
                createRequest("GET", "Listar usuarios", "{{baseUrl}}/api/admin/usuarios", null, "Lista todos os usuarios"),
                createRequest("GET", "Listar planos", "{{baseUrl}}/api/admin/planos", null, "Lista definicoes dos planos")
        )));

        // 8. Profile
        items.add(createFolder("Perfil", List.of(
                createRequest("GET", "Meu perfil", "{{baseUrl}}/api/profile", null, "Retorna perfil do usuario logado"),
                createRequest("PUT", "Atualizar perfil", "{{baseUrl}}/api/profile",
                        "{\"name\": \"Novo Nome\"}", "Atualiza nome/senha"),
                createRequest("PUT", "Upgrade plano", "{{baseUrl}}/api/profile/plano", null, "Upgrade para proximo plano")
        )));

        collection.put("item", items);

        return ResponseEntity.ok(collection);
    }

    @GetMapping("/environments")
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
