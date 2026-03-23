package com.triageai.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/training")
@RequiredArgsConstructor
public class AiTrainingController {

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    private RestClient client() {
        return RestClient.builder().baseUrl(aiServiceUrl).build();
    }

    @PostMapping("/add")
    public ResponseEntity<Map> addTrainingData(@RequestBody Map<String, Object> body) {
        Map result = client().post().uri("/training/add")
                .contentType(MediaType.APPLICATION_JSON).body(body)
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/dataset")
    public ResponseEntity<Map> getDatasetStats() {
        Map result = client().get().uri("/training/dataset")
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/generate")
    public ResponseEntity<Map> generateTrainingData(@RequestBody Map<String, Object> body) {
        Map result = client().post().uri("/training/generate")
                .contentType(MediaType.APPLICATION_JSON).body(body)
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/save-generated")
    public ResponseEntity<Map> saveGeneratedData(@RequestBody Map<String, Object> body) {
        Map result = client().post().uri("/training/save-generated")
                .contentType(MediaType.APPLICATION_JSON).body(body)
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/guidelines")
    public ResponseEntity<Map> getGuidelines() {
        Map result = client().get().uri("/training/guidelines")
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/guidelines")
    public ResponseEntity<Map> saveGuidelines(@RequestBody Map<String, Object> body) {
        Map result = client().put().uri("/training/guidelines")
                .contentType(MediaType.APPLICATION_JSON).body(body)
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/retrain")
    public ResponseEntity<Map> retrain() {
        Map result = client().post().uri("/training/retrain")
                .contentType(MediaType.APPLICATION_JSON).body(Map.of())
                .retrieve().body(Map.class);
        return ResponseEntity.ok(result);
    }
}
