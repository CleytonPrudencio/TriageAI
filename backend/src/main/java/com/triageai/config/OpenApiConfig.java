package com.triageai.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI triageAiOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("TriageAI API")
                        .description("TriageAI e um sistema inteligente de classificacao e priorizacao automatica de chamados utilizando IA (NLP). " +
                                "O sistema classifica tickets automaticamente, gera correcoes de codigo via integracao com GitHub/GitLab/Bitbucket, " +
                                "cria Pull Requests, e permite integracoes com Jira, Zendesk e outras plataformas via API e webhooks. " +
                                "\n\n" +
                                "## Autenticacao\n" +
                                "- **JWT Bearer**: Para endpoints internos. Obtenha o token via POST /api/auth/login\n" +
                                "- **API Key**: Para integracoes externas (endpoints /api/v1/*). Gere em /api/api-keys\n\n" +
                                "## Fluxo Principal\n" +
                                "1. Criar chamado → IA classifica automaticamente\n" +
                                "2. Se TECNICO + auto-fix ativo → IA analisa codigo e cria PR\n" +
                                "3. Reviewer aprova → ticket resolvido\n\n" +
                                "## Planos\n" +
                                "- FREE: 50 tickets/mes, 3 usuarios\n" +
                                "- PRO: 500 tickets/mes, auto-fix, API\n" +
                                "- BUSINESS: Ilimitado\n" +
                                "- BUSINESS+CLAUDE: Ilimitado + 15 analises Claude/mes\n" +
                                "- ENTERPRISE: Ilimitado + 100 analises Claude/mes")
                        .version("1.0.0")
                        .contact(new Contact().name("TriageAI").email("contato@triageai.com")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local"),
                        new Server().url("https://api.triageai.com").description("Producao")))
                .components(new Components()
                        .addSecuritySchemes("bearer", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT obtido em /api/auth/login"))
                        .addSecuritySchemes("apiKey", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-API-Key")
                                .description("API Key para integracoes externas")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
