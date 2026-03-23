package com.triageai.controller;

import com.triageai.model.ApiKey;
import com.triageai.repository.ApiKeyRepository;
import com.triageai.security.ApiKeyAuthFilter;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyRepository apiKeyRepository;

    @GetMapping
    public ResponseEntity<?> listKeys() {
        List<ApiKey> keys = apiKeyRepository.findByActiveTrue();
        return ResponseEntity.ok(keys.stream().map(k -> Map.of(
                "id", k.getId(),
                "name", k.getName(),
                "prefix", k.getPrefix(),
                "createdAt", k.getCreatedAt().toString(),
                "lastUsedAt", k.getLastUsedAt() != null ? k.getLastUsedAt().toString() : "Never"
        )).toList());
    }

    @PostMapping
    public ResponseEntity<?> createKey(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "API Key");

        // Generate a random API key
        String rawKey = "trai_" + UUID.randomUUID().toString().replace("-", "");
        String prefix = rawKey.substring(0, 12) + "...";

        try {
            String hash = ApiKeyAuthFilter.hashKey(rawKey);

            ApiKey apiKey = ApiKey.builder()
                    .name(name)
                    .keyHash(hash)
                    .prefix(prefix)
                    .active(true)
                    .build();
            apiKeyRepository.save(apiKey);

            // Return the raw key ONLY ONCE (never stored in plaintext)
            return ResponseEntity.ok(Map.of(
                    "id", apiKey.getId(),
                    "name", name,
                    "key", rawKey,
                    "prefix", prefix,
                    "message", "Save this key - it won't be shown again!"
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create key"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revokeKey(@PathVariable Long id) {
        apiKeyRepository.findById(id).ifPresent(key -> {
            key.setActive(false);
            apiKeyRepository.save(key);
        });
        return ResponseEntity.ok(Map.of("message", "Key revoked"));
    }
}
