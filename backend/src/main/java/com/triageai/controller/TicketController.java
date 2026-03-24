package com.triageai.controller;

import com.triageai.dto.FeedbackRequest;
import com.triageai.dto.TicketRequest;
import com.triageai.dto.TicketResponse;
import com.triageai.model.User;
import com.triageai.model.enums.Category;
import com.triageai.model.enums.Priority;
import com.triageai.model.enums.Status;
import com.triageai.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Gerenciamento de chamados com classificacao automatica por IA")
public class TicketController {

    private final TicketService ticketService;

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    @PostMapping
    @Operation(summary = "Criar chamado", description = "Cria um novo chamado. A IA classifica automaticamente a categoria e prioridade baseado no texto.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chamado criado e classificado pela IA"),
            @ApiResponse(responseCode = "400", description = "Dados invalidos")
    })
    public ResponseEntity<TicketResponse> create(
            @Valid @RequestBody TicketRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.create(request, user));
    }

    @GetMapping
    @Operation(summary = "Listar chamados", description = "Lista todos os chamados do usuario com paginacao e filtros. Pode filtrar por status, prioridade ou categoria.")
    public ResponseEntity<Page<TicketResponse>> findAll(
            @Parameter(description = "Filtrar por status: ABERTO, EM_ANDAMENTO, CODE_REVIEW, RESOLVIDO, FECHADO") @RequestParam(required = false) String status,
            @Parameter(description = "Filtrar por prioridade: CRITICA, ALTA, MEDIA, BAIXA") @RequestParam(required = false) String prioridade,
            @Parameter(description = "Filtrar por categoria: TECNICO, FINANCEIRO, COMERCIAL, SUPORTE, OUTROS") @RequestParam(required = false) String categoria,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal User user) {

        if (status != null) {
            return ResponseEntity.ok(ticketService.findByStatus(Status.valueOf(status), pageable, user));
        }
        if (prioridade != null) {
            return ResponseEntity.ok(ticketService.findByPrioridade(Priority.valueOf(prioridade), pageable, user));
        }
        if (categoria != null) {
            return ResponseEntity.ok(ticketService.findByCategoria(Category.valueOf(categoria), pageable, user));
        }
        return ResponseEntity.ok(ticketService.findAll(pageable, user));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar chamado por ID", description = "Busca um chamado pelo ID com detalhes completos incluindo info do PR")
    public ResponseEntity<TicketResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar chamado", description = "Atualiza titulo e descricao do chamado. A IA reclassifica automaticamente se o texto mudar.")
    public ResponseEntity<TicketResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TicketRequest request) {
        return ResponseEntity.ok(ticketService.update(id, request));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Alterar status", description = "Altera o status do chamado (ABERTO, EM_ANDAMENTO, CODE_REVIEW, RESOLVIDO, FECHADO)")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ticketService.updateStatus(id, status));
    }

    @PutMapping("/{id}/feedback")
    @Operation(summary = "Feedback da classificacao", description = "Envia correcao da classificacao da IA para re-treino do modelo. Informe a categoria e prioridade corretas.")
    public ResponseEntity<TicketResponse> feedback(
            @PathVariable Long id,
            @RequestBody FeedbackRequest request) {
        return ResponseEntity.ok(ticketService.feedback(id, request));
    }

    @PutMapping("/{id}/reclassify")
    @Operation(summary = "Reclassificar chamado", description = "Reclassifica o chamado com o modelo de IA mais recente. Util apos re-treino do modelo.")
    public ResponseEntity<TicketResponse> reclassify(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.reclassify(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir chamado", description = "Remove permanentemente um chamado pelo ID")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ticketService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/enrich")
    @Operation(summary = "Enriquecer chamado com IA", description = "Analisa o texto do chamado com IA e retorna descricao enriquecida, perguntas para detalhar, impacto estimado e componentes afetados")
    public ResponseEntity<?> enrichTicket(@RequestBody Map<String, String> body) {
        try {
            Map result = RestClient.builder().baseUrl(aiServiceUrl).build()
                    .post().uri("/enrich-ticket")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve().body(Map.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "classificacao", Map.of("categoria", "OUTROS", "prioridade", "MEDIA", "score", 0),
                    "descricaoEnriquecida", body.getOrDefault("text", ""),
                    "perguntas", List.of("Descreva o problema com mais detalhes"),
                    "sugestoes", List.of("Adicione informacoes tecnicas"),
                    "impacto", "medio",
                    "passosReproduzir", List.of(),
                    "componentesAfetados", List.of()
            ));
        }
    }

    @PostMapping("/refine")
    @Operation(summary = "Refinar descricao do chamado", description = "Refina a descricao do chamado incorporando respostas do usuario as perguntas da IA. Envia descricao atual + respostas e recebe descricao melhorada.")
    public ResponseEntity<?> refineTicket(@RequestBody Map<String, Object> body) {
        try {
            Map result = RestClient.builder().baseUrl(aiServiceUrl).build()
                    .post().uri("/refine-ticket")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve().body(Map.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("descricaoEnriquecida", body.getOrDefault("descricaoAtual", "")));
        }
    }
}
