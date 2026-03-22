package com.triageai.service;

import com.triageai.dto.AiPredictionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@Slf4j
public class AiService {

    private final RestClient restClient;

    public AiService(@Value("${app.ai-service.url}") String aiServiceUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);

        this.restClient = RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(factory)
                .build();
    }

    public AiPredictionResponse predict(String text) {
        try {
            return restClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", text))
                    .retrieve()
                    .body(AiPredictionResponse.class);
        } catch (Exception e) {
            log.warn("AI service unavailable, using fallback: {}", e.getMessage());
            AiPredictionResponse fallback = new AiPredictionResponse();
            fallback.setCategoria("OUTROS");
            fallback.setPrioridade("MEDIA");
            fallback.setScore(0.0);
            return fallback;
        }
    }

    @Async
    public void sendFeedback(Long ticketId, String text, String categoria, String prioridade) {
        try {
            restClient.post()
                    .uri("/feedback")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "ticket_id", ticketId,
                            "text", text,
                            "categoria", categoria,
                            "prioridade", prioridade
                    ))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Feedback sent to AI service for ticket #{}", ticketId);
        } catch (Exception e) {
            log.warn("Failed to send feedback to AI service: {}", e.getMessage());
        }
    }
}
