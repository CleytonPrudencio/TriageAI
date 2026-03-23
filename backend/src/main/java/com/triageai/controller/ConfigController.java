package com.triageai.controller;

import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    @GetMapping
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
