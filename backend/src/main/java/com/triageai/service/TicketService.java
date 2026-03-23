package com.triageai.service;

import com.triageai.dto.*;
import com.triageai.model.Ticket;
import com.triageai.model.User;
import com.triageai.model.enums.Category;
import com.triageai.model.enums.Priority;
import com.triageai.model.enums.Status;
import com.triageai.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final AiService aiService;

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    public TicketResponse create(TicketRequest request, User user) {
        String fullText = request.getTitulo() + " " + request.getDescricao();
        AiPredictionResponse prediction = aiService.predict(fullText);

        Ticket ticket = Ticket.builder()
                .titulo(request.getTitulo())
                .descricao(request.getDescricao())
                .categoria(Category.valueOf(prediction.getCategoria()))
                .prioridade(Priority.valueOf(prediction.getPrioridade()))
                .status(Status.ABERTO)
                .aiScore(prediction.getScore())
                .user(user)
                .build();

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    public Page<TicketResponse> findAll(Pageable pageable) {
        return ticketRepository.findAll(pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByStatus(Status status, Pageable pageable) {
        return ticketRepository.findByStatus(status, pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByPrioridade(Priority prioridade, Pageable pageable) {
        return ticketRepository.findByPrioridade(prioridade, pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByCategoria(Category categoria, Pageable pageable) {
        return ticketRepository.findByCategoria(categoria, pageable).map(TicketResponse::from);
    }

    public TicketResponse findById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));
        return TicketResponse.from(ticket);
    }

    public TicketResponse update(Long id, TicketRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        ticket.setTitulo(request.getTitulo());
        ticket.setDescricao(request.getDescricao());

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    public TicketResponse updateStatus(Long id, String status) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        ticket.setStatus(Status.valueOf(status));
        return TicketResponse.from(ticketRepository.save(ticket));
    }

    public TicketResponse feedback(Long id, FeedbackRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        if (request.getCategoria() != null) {
            ticket.setCategoria(Category.valueOf(request.getCategoria()));
        }
        if (request.getPrioridade() != null) {
            ticket.setPrioridade(Priority.valueOf(request.getPrioridade()));
        }

        Ticket saved = ticketRepository.save(ticket);

        aiService.sendFeedback(id,
                ticket.getTitulo() + " " + ticket.getDescricao(),
                saved.getCategoria().name(),
                saved.getPrioridade().name());

        return TicketResponse.from(saved);
    }

    public TicketResponse reclassify(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        String fullText = ticket.getTitulo() + " " + ticket.getDescricao();
        AiPredictionResponse prediction = aiService.predict(fullText);

        ticket.setCategoria(Category.valueOf(prediction.getCategoria()));
        ticket.setPrioridade(Priority.valueOf(prediction.getPrioridade()));
        ticket.setAiScore(prediction.getScore());

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    public void delete(Long id) {
        ticketRepository.deleteById(id);
    }

    public DashboardStats getStats() {
        DashboardStats stats = new DashboardStats();
        stats.setTotalTickets(ticketRepository.count());

        // Time-based counts
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        stats.setTicketsHoje(ticketRepository.countByCreatedAtAfter(now.toLocalDate().atStartOfDay()));
        stats.setTicketsSemana(ticketRepository.countByCreatedAtAfter(now.minusDays(7)));
        stats.setTicketsMes(ticketRepository.countByCreatedAtAfter(now.minusDays(30)));

        // Groupings
        stats.setByCategoria(new java.util.LinkedHashMap<>());
        ticketRepository.countByCategoriagrouped().forEach(row ->
                stats.getByCategoria().put(row[0].toString(), (Long) row[1]));

        stats.setByPrioridade(new java.util.LinkedHashMap<>());
        ticketRepository.countByPrioridadeGrouped().forEach(row ->
                stats.getByPrioridade().put(row[0].toString(), (Long) row[1]));

        stats.setByStatus(new java.util.LinkedHashMap<>());
        ticketRepository.countByStatusGrouped().forEach(row ->
                stats.getByStatus().put(row[0].toString(), (Long) row[1]));

        // AI metrics
        stats.setMediaAiScore(ticketRepository.avgAiScore());

        // PR metrics
        stats.setTotalPRs(ticketRepository.countWithPr());
        java.util.Map<String, Long> prStats = new java.util.LinkedHashMap<>();
        ticketRepository.countByPrStatusGrouped().forEach(row ->
                prStats.put(row[0].toString(), (Long) row[1]));
        stats.setPrsMerged(prStats.getOrDefault("MERGED", 0L));
        stats.setPrsOpen(prStats.getOrDefault("OPEN", 0L));
        stats.setPrsClosed(prStats.getOrDefault("CLOSED", 0L));

        // Recent tickets
        stats.setTicketsRecentes(
                ticketRepository.findTop10ByOrderByCreatedAtDesc()
                        .stream().map(TicketResponse::from).toList()
        );

        // AI model metrics from Python service
        try {
            org.springframework.web.client.RestClient client =
                    org.springframework.web.client.RestClient.builder().baseUrl(aiServiceUrl).build();
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> metrics = client.get()
                    .uri("/metrics").retrieve().body(java.util.Map.class);
            if (metrics != null) {
                stats.setIaDatasetSize(((Number) metrics.getOrDefault("dataset_size", 0)).intValue());
                stats.setIaTrainedAt((String) metrics.getOrDefault("trained_at", ""));
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> catMetrics = (java.util.Map<String, Object>) metrics.get("categoria");
                if (catMetrics != null) {
                    stats.setIaAccuracy(((Number) catMetrics.getOrDefault("accuracy", 0)).doubleValue());
                    stats.setIaF1Score(((Number) catMetrics.getOrDefault("f1_weighted", 0)).doubleValue());
                }
            }
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> version = client.get()
                    .uri("/version").retrieve().body(java.util.Map.class);
            if (version != null) {
                stats.setIaModelVersion(((Number) version.getOrDefault("version", 0)).intValue());
            }
        } catch (Exception e) {
            // AI service may be offline
            stats.setIaModelVersion(0);
            stats.setIaAccuracy(0);
            stats.setIaF1Score(0);
        }

        return stats;
    }
}
