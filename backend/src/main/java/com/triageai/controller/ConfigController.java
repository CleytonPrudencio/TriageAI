package com.triageai.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
@Tag(name = "Configuracao", description = "Configuracoes do sistema incluindo chave da API Claude")
public class ConfigController {

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    @GetMapping
    @Operation(summary = "Ver configuracoes", description = "Retorna configuracoes atuais do servico de IA, incluindo se a chave Anthropic esta configurada.")
    public ResponseEntity<?> getConfig() {
        try {
            RestClient client = RestClient.builder().baseUrl(aiServiceUrl).build();
            Map result = client.get().uri("/config").retrieve().body(Map.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("anthropic_key_set", false, "error", e.getMessage()));
        }
    }

    @PostMapping
    @Operation(summary = "Salvar configuracoes", description = "Salva configuracoes do servico de IA. Use para configurar a chave da API Claude (anthropic_api_key).")
    public ResponseEntity<?> saveConfig(@RequestBody Map<String, String> body) {
        try {
            RestClient client = RestClient.builder().baseUrl(aiServiceUrl).build();
            Map result = client.post().uri("/config")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve().body(Map.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
