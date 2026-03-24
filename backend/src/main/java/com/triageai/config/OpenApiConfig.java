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
                        .description("API para classificacao inteligente e priorizacao automatica de chamados com IA")
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
