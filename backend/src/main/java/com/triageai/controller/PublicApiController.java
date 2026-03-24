package com.triageai.controller;

import com.triageai.dto.AiPredictionResponse;
import com.triageai.service.*;
import com.triageai.model.*;
import com.triageai.model.enums.*;
import com.triageai.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
@Slf4j
@RequiredArgsConstructor
@Tag(name = "API Publica v1", description = "API para integracoes externas (Jira, Zendesk, Freshdesk, ServiceNow). Autenticacao via header X-API-Key.")
@SecurityRequirement(name = "apiKey")
public class PublicApiController {

    private final AiService aiService;
    private final GitIntegrationService gitIntegrationService;
    private final TicketRepository ticketRepository;

    // ========== CLASSIFY ==========

    @PostMapping("/classify")
    @Operation(summary = "Classificar texto", description = "Classifica um texto livre retornando categoria, prioridade e score de confianca da IA. Ideal para pre-classificar tickets antes de criar.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Texto classificado com sucesso. Retorna categoria, prioridade, score e versao do modelo."),
            @ApiResponse(responseCode = "401", description = "API Key invalida ou ausente")
    })
    public ResponseEntity<?> classify(@RequestBody ClassifyRequest req) {
        log.info("API v1: classify request");
        AiPredictionResponse result = aiService.predict(req.getText());
        return ResponseEntity.ok(Map.of(
                "categoria", result.getCategoria() != null ? result.getCategoria() : "OUTROS",
                "prioridade", result.getPrioridade() != null ? result.getPrioridade() : "MEDIA",
                "score", result.getScore() != null ? result.getScore() : 0,
                "model_version", "1.0.0"
        ));
    }

    // ========== CREATE TICKET + CLASSIFY ==========

    @PostMapping("/tickets")
    @Operation(summary = "Criar ticket via API", description = "Cria um ticket com classificacao automatica. Use para integrar sistemas externos como Jira, Zendesk, Freshdesk ou ServiceNow.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket criado e classificado. Retorna ID, categoria, prioridade e score."),
            @ApiResponse(responseCode = "401", description = "API Key invalida ou ausente")
    })
    public ResponseEntity<?> createTicket(@RequestBody CreateTicketRequest req) {
        log.info("API v1: create ticket '{}'", req.getTitulo());

        // Classify with AI
        String fullText = req.getTitulo() + " " + req.getDescricao();
        AiPredictionResponse prediction = aiService.predict(fullText);

        Ticket ticket = Ticket.builder()
                .titulo(req.getTitulo())
                .descricao(req.getDescricao())
                .status(Status.ABERTO)
                .categoria(Category.valueOf(prediction.getCategoria() != null ? prediction.getCategoria() : "OUTROS"))
                .prioridade(Priority.valueOf(prediction.getPrioridade() != null ? prediction.getPrioridade() : "MEDIA"))
                .aiScore(prediction.getScore() != null ? prediction.getScore() : 0.0)
                .build();

        Ticket saved = ticketRepository.save(ticket);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "titulo", saved.getTitulo(),
                "categoria", saved.getCategoria().name(),
                "prioridade", saved.getPrioridade().name(),
                "status", saved.getStatus().name(),
                "ai_score", saved.getAiScore(),
                "created_at", saved.getCreatedAt().toString()
        ));
    }

    // ========== AUTO-FIX ==========

    @PostMapping("/tickets/{id}/auto-fix")
    @Operation(summary = "Executar auto-fix", description = "Executa auto-fix: IA analisa o repositorio, cria branch, gera correcao e abre Pull Request automaticamente. Requer repoConfigId ou configuracao padrao.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Auto-fix executado. Retorna URL do PR, branch e resumo das alteracoes."),
            @ApiResponse(responseCode = "400", description = "Erro ao executar auto-fix (repo nao configurado, ticket nao encontrado, etc.)")
    })
    public ResponseEntity<?> autoFix(@PathVariable Long id, @RequestBody(required = false) AutoFixRequest req) {
        log.info("API v1: auto-fix for ticket #{}", id);

        Long repoConfigId = req != null && req.getRepoConfigId() != null ? req.getRepoConfigId() : null;
        String branchType = req != null && req.getBranchType() != null ? req.getBranchType() : "fix";
        String branchName = req != null && req.getBranchName() != null ? req.getBranchName() : "ticket-" + id;

        try {
            var result = gitIntegrationService.processAutoFix(id, repoConfigId, branchType, branchName);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== FEEDBACK ==========

    @PostMapping("/tickets/{id}/feedback")
    @Operation(summary = "Enviar feedback", description = "Envia correcao da classificacao para re-treino do modelo de IA. Informe a categoria e prioridade corretas.")
    public ResponseEntity<?> feedback(@PathVariable Long id, @RequestBody FeedbackRequest req) {
        log.info("API v1: feedback for ticket #{}", id);

        var ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        ticket.setCategoria(Category.valueOf(req.getCategoria()));
        ticket.setPrioridade(Priority.valueOf(req.getPrioridade()));
        ticketRepository.save(ticket);

        // Send feedback to AI asynchronously
        String fullText = ticket.getTitulo() + " " + ticket.getDescricao();
        aiService.sendFeedback(ticket.getId(), fullText, req.getCategoria(), req.getPrioridade());

        return ResponseEntity.ok(Map.of(
                "message", "Feedback received",
                "ticket_id", id,
                "new_categoria", req.getCategoria(),
                "new_prioridade", req.getPrioridade()
        ));
    }

    // ========== RECLASSIFY ==========

    @PostMapping("/tickets/{id}/reclassify")
    @Operation(summary = "Reclassificar ticket", description = "Reclassifica o ticket com o modelo de IA mais recente. Retorna classificacao anterior e nova para comparacao.")
    public ResponseEntity<?> reclassify(@PathVariable Long id) {
        log.info("API v1: reclassify ticket #{}", id);

        var ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        String fullText = ticket.getTitulo() + " " + ticket.getDescricao();
        AiPredictionResponse prediction = aiService.predict(fullText);

        String oldCat = ticket.getCategoria().name();
        String oldPri = ticket.getPrioridade().name();

        ticket.setCategoria(Category.valueOf(prediction.getCategoria() != null ? prediction.getCategoria() : "OUTROS"));
        ticket.setPrioridade(Priority.valueOf(prediction.getPrioridade() != null ? prediction.getPrioridade() : "MEDIA"));
        ticket.setAiScore(prediction.getScore() != null ? prediction.getScore() : 0.0);
        ticketRepository.save(ticket);

        return ResponseEntity.ok(Map.of(
                "ticket_id", id,
                "old_categoria", oldCat,
                "new_categoria", ticket.getCategoria().name(),
                "old_prioridade", oldPri,
                "new_prioridade", ticket.getPrioridade().name(),
                "ai_score", ticket.getAiScore()
        ));
    }

    // ========== GET TICKET STATUS ==========

    @GetMapping("/tickets/{id}")
    @Operation(summary = "Consultar ticket", description = "Retorna detalhes completos do ticket incluindo classificacao, status e informacoes do PR (se existir).")
    public ResponseEntity<?> getTicket(@PathVariable Long id) {
        var ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", ticket.getId());
        response.put("titulo", ticket.getTitulo());
        response.put("descricao", ticket.getDescricao());
        response.put("categoria", ticket.getCategoria().name());
        response.put("prioridade", ticket.getPrioridade().name());
        response.put("status", ticket.getStatus().name());
        response.put("ai_score", ticket.getAiScore());
        response.put("created_at", ticket.getCreatedAt().toString());
        if (ticket.getPrUrl() != null) response.put("pr_url", ticket.getPrUrl());
        if (ticket.getPrStatus() != null) response.put("pr_status", ticket.getPrStatus());
        if (ticket.getPrBranch() != null) response.put("pr_branch", ticket.getPrBranch());
        if (ticket.getPrSummary() != null) response.put("pr_summary", ticket.getPrSummary());

        return ResponseEntity.ok(response);
    }

    // ========== WEBHOOKS (incoming from Jira/Zendesk) ==========

    @PostMapping("/webhooks/jira")
    @Operation(summary = "Webhook Jira", description = "Recebe webhook do Jira quando um ticket e criado/atualizado. Configure no Jira: Settings > Webhooks > URL + header X-API-Key. Payload esperado: {issue: {key, fields: {summary, description}}}")
    public ResponseEntity<?> jiraWebhook(@RequestBody Map<String, Object> payload) {
        log.info("API v1: Jira webhook received");

        try {
            Map<?, ?> issue = (Map<?, ?>) payload.get("issue");
            Map<?, ?> fields = (Map<?, ?>) issue.get("fields");

            String titulo = fields.get("summary").toString();
            String descricao = fields.containsKey("description") && fields.get("description") != null
                    ? fields.get("description").toString() : "";
            String jiraKey = issue.get("key").toString();

            String fullText = titulo + " " + descricao;
            AiPredictionResponse prediction = aiService.predict(fullText);

            return ResponseEntity.ok(Map.of(
                    "jira_key", jiraKey,
                    "categoria", prediction.getCategoria() != null ? prediction.getCategoria() : "OUTROS",
                    "prioridade", prediction.getPrioridade() != null ? prediction.getPrioridade() : "MEDIA",
                    "score", prediction.getScore() != null ? prediction.getScore() : 0,
                    "message", "Classified successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid Jira payload: " + e.getMessage()));
        }
    }

    @PostMapping("/webhooks/zendesk")
    @Operation(summary = "Webhook Zendesk", description = "Recebe webhook do Zendesk. Configure: Admin > Webhooks > HTTP endpoint. Payload esperado: {id, subject, description}")
    public ResponseEntity<?> zendeskWebhook(@RequestBody Map<String, Object> payload) {
        log.info("API v1: Zendesk webhook received");

        try {
            String titulo = payload.getOrDefault("subject", "").toString();
            String descricao = payload.getOrDefault("description", "").toString();
            String ticketId = payload.getOrDefault("id", "").toString();

            String fullText = titulo + " " + descricao;
            AiPredictionResponse prediction = aiService.predict(fullText);

            return ResponseEntity.ok(Map.of(
                    "zendesk_id", ticketId,
                    "categoria", prediction.getCategoria() != null ? prediction.getCategoria() : "OUTROS",
                    "prioridade", prediction.getPrioridade() != null ? prediction.getPrioridade() : "MEDIA",
                    "score", prediction.getScore() != null ? prediction.getScore() : 0,
                    "message", "Classified successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid Zendesk payload: " + e.getMessage()));
        }
    }

    @PostMapping("/webhooks/generic")
    @Operation(summary = "Webhook generico", description = "Webhook generico. Aceita {title, description} ou {subject, body}. Compativel com qualquer plataforma que envie POST com JSON.")
    public ResponseEntity<?> genericWebhook(@RequestBody Map<String, Object> payload) {
        log.info("API v1: Generic webhook received");

        String titulo = payload.getOrDefault("title", payload.getOrDefault("subject", "")).toString();
        String descricao = payload.getOrDefault("description", payload.getOrDefault("body", "")).toString();

        if (titulo.isBlank() && descricao.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide 'title' or 'description'"));
        }

        String fullText = titulo + " " + descricao;
        AiPredictionResponse prediction = aiService.predict(fullText);

        return ResponseEntity.ok(Map.of(
                "categoria", prediction.getCategoria() != null ? prediction.getCategoria() : "OUTROS",
                "prioridade", prediction.getPrioridade() != null ? prediction.getPrioridade() : "MEDIA",
                "score", prediction.getScore() != null ? prediction.getScore() : 0,
                "message", "Classified successfully"
        ));
    }

    // ========== HEALTH ==========

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Verifica se a API esta respondendo. Retorna status, versao e timestamp. Nao requer autenticacao.")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "service", "TriageAI",
                "version", "1.0.0",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    // ========== DTOs ==========

    @Data
    public static class ClassifyRequest {
        private String text;
    }

    @Data
    public static class CreateTicketRequest {
        private String titulo;
        private String descricao;
    }

    @Data
    public static class AutoFixRequest {
        private Long repoConfigId;
        private String branchType;
        private String branchName;
    }

    @Data
    public static class FeedbackRequest {
        private String categoria;
        private String prioridade;
    }
}
