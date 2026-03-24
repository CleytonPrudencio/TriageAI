package com.triageai.service;

import com.triageai.dto.*;
import com.triageai.model.Ticket;
import com.triageai.model.User;
import com.triageai.model.enums.Category;
import com.triageai.model.enums.Priority;
import com.triageai.model.enums.Role;
import com.triageai.model.enums.Status;
import com.triageai.repository.SistemaRepository;
import com.triageai.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final AiService aiService;
    private final SistemaRepository sistemaRepository;
    private final GitIntegrationService gitIntegrationService;

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    public TicketResponse create(TicketRequest request, User user) {
        Category cat;
        Priority pri;
        double score;

        // Use pre-classification from enrich step if provided
        if (request.getCategoria() != null && request.getPrioridade() != null) {
            cat = Category.valueOf(request.getCategoria());
            pri = Priority.valueOf(request.getPrioridade());
            score = request.getAiScore() != null ? request.getAiScore() : 0;
        } else {
            // Fallback: classify with ML model
            String fullText = request.getTitulo() + " " + request.getDescricao();
            AiPredictionResponse prediction = aiService.predict(fullText);
            cat = Category.valueOf(prediction.getCategoria());
            pri = Priority.valueOf(prediction.getPrioridade());
            score = prediction.getScore();
        }

        Ticket ticket = Ticket.builder()
                .titulo(request.getTitulo())
                .descricao(request.getDescricao())
                .categoria(cat)
                .prioridade(pri)
                .status(Status.ABERTO)
                .aiScore(score)
                .user(user)
                .build();

        // Link sistema if provided
        if (request.getSistemaId() != null) {
            sistemaRepository.findById(request.getSistemaId()).ifPresent(sistema -> {
                ticket.setSistema(sistema);
                ticket.setRepoConfig(sistema.getRepoConfig());
            });
        }

        Ticket saved = ticketRepository.save(ticket);

        // Auto-fix if sistema has it enabled and ticket is TECNICO
        if (saved.getSistema() != null
                && saved.getSistema().isAutoFixEnabled()
                && saved.getCategoria() == Category.TECNICO
                && saved.getSistema().getRepoConfig() != null) {
            saved.setStatus(Status.EM_ANDAMENTO);
            ticketRepository.save(saved);
            triggerAutoFixAsync(saved);
        }

        return TicketResponse.from(saved);
    }

    public Page<TicketResponse> findAll(Pageable pageable) {
        return ticketRepository.findAll(pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findAll(Pageable pageable, User user) {
        if (user == null || user.getRole() == Role.ADMIN) {
            return ticketRepository.findAll(pageable).map(TicketResponse::from);
        }
        if (user.getEmpresa() != null) {
            return ticketRepository.findByUserEmpresaId(user.getEmpresa().getId(), pageable).map(TicketResponse::from);
        }
        return ticketRepository.findByUserId(user.getId(), pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByStatus(Status status, Pageable pageable) {
        return ticketRepository.findByStatus(status, pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByStatus(Status status, Pageable pageable, User user) {
        if (user == null || user.getRole() == Role.ADMIN) {
            return ticketRepository.findByStatus(status, pageable).map(TicketResponse::from);
        }
        if (user.getEmpresa() != null) {
            return ticketRepository.findByUserEmpresaIdAndStatus(user.getEmpresa().getId(), status, pageable).map(TicketResponse::from);
        }
        return ticketRepository.findByUserId(user.getId(), pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByPrioridade(Priority prioridade, Pageable pageable) {
        return ticketRepository.findByPrioridade(prioridade, pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByPrioridade(Priority prioridade, Pageable pageable, User user) {
        if (user == null || user.getRole() == Role.ADMIN) {
            return ticketRepository.findByPrioridade(prioridade, pageable).map(TicketResponse::from);
        }
        if (user.getEmpresa() != null) {
            return ticketRepository.findByUserEmpresaIdAndPrioridade(user.getEmpresa().getId(), prioridade, pageable).map(TicketResponse::from);
        }
        return ticketRepository.findByUserId(user.getId(), pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByCategoria(Category categoria, Pageable pageable) {
        return ticketRepository.findByCategoria(categoria, pageable).map(TicketResponse::from);
    }

    public Page<TicketResponse> findByCategoria(Category categoria, Pageable pageable, User user) {
        if (user == null || user.getRole() == Role.ADMIN) {
            return ticketRepository.findByCategoria(categoria, pageable).map(TicketResponse::from);
        }
        if (user.getEmpresa() != null) {
            return ticketRepository.findByUserEmpresaIdAndCategoria(user.getEmpresa().getId(), categoria, pageable).map(TicketResponse::from);
        }
        return ticketRepository.findByUserId(user.getId(), pageable).map(TicketResponse::from);
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

    public DashboardStats getStats(User currentUser) {
        // If not ADMIN and has empresa/user context, filter tickets
        if (currentUser != null && !"ADMIN".equals(currentUser.getRole().name())) {
            return getFilteredStats(currentUser);
        }
        return getGlobalStats();
    }

    private DashboardStats getFilteredStats(User currentUser) {
        java.util.List<Ticket> tickets;
        if (currentUser.getEmpresa() != null) {
            tickets = ticketRepository.findAll().stream()
                    .filter(t -> t.getUser() != null && t.getUser().getEmpresa() != null
                            && t.getUser().getEmpresa().getId().equals(currentUser.getEmpresa().getId()))
                    .toList();
        } else {
            tickets = ticketRepository.findAll().stream()
                    .filter(t -> t.getUser() != null && t.getUser().getId().equals(currentUser.getId()))
                    .toList();
        }

        DashboardStats stats = new DashboardStats();
        stats.setTotalTickets(tickets.size());

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        stats.setTicketsHoje((long) tickets.stream().filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(now.toLocalDate().atStartOfDay())).toList().size());
        stats.setTicketsSemana((long) tickets.stream().filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(now.minusDays(7))).toList().size());
        stats.setTicketsMes((long) tickets.stream().filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(now.minusDays(30))).toList().size());

        stats.setByCategoria(new java.util.LinkedHashMap<>());
        tickets.stream().collect(java.util.stream.Collectors.groupingBy(t -> t.getCategoria().name(), java.util.stream.Collectors.counting()))
                .forEach((k, v) -> stats.getByCategoria().put(k, v));

        stats.setByPrioridade(new java.util.LinkedHashMap<>());
        tickets.stream().collect(java.util.stream.Collectors.groupingBy(t -> t.getPrioridade().name(), java.util.stream.Collectors.counting()))
                .forEach((k, v) -> stats.getByPrioridade().put(k, v));

        stats.setByStatus(new java.util.LinkedHashMap<>());
        tickets.stream().collect(java.util.stream.Collectors.groupingBy(t -> t.getStatus().name(), java.util.stream.Collectors.counting()))
                .forEach((k, v) -> stats.getByStatus().put(k, v));

        stats.setMediaAiScore(tickets.stream().mapToDouble(Ticket::getAiScore).average().orElse(0));
        stats.setTotalPRs(tickets.stream().filter(t -> t.getPrUrl() != null).count());

        long merged = tickets.stream().filter(t -> "MERGED".equals(t.getPrStatus())).count();
        long open = tickets.stream().filter(t -> "OPEN".equals(t.getPrStatus())).count();
        long closed = tickets.stream().filter(t -> "CLOSED".equals(t.getPrStatus())).count();
        stats.setPrsMerged(merged);
        stats.setPrsOpen(open);
        stats.setPrsClosed(closed);

        stats.setTicketsRecentes(tickets.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(10).map(TicketResponse::from).toList());

        // AI model metrics (shared - not tenant specific)
        loadAiMetrics(stats);

        return stats;
    }

    private DashboardStats getGlobalStats() {
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

        loadAiMetrics(stats);

        return stats;
    }

    private void loadAiMetrics(DashboardStats stats) {
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
            stats.setIaModelVersion(0);
            stats.setIaAccuracy(0);
            stats.setIaF1Score(0);
        }
    }

    @Async
    public void triggerAutoFixAsync(Ticket ticket) {
        try {
            com.triageai.model.Sistema sistema = ticket.getSistema();
            String fullText = ticket.getTitulo() + " " + ticket.getDescricao();
            String categoria = ticket.getCategoria() != null ? ticket.getCategoria().name() : "";
            String branchType = aiService.predictBranchType(fullText, categoria);
            log.info("AI predicted branch type '{}' for ticket #{}", branchType, ticket.getId());
            String branchName = "ticket-" + ticket.getId();
            gitIntegrationService.processAutoFix(ticket.getId(), sistema.getRepoConfig().getId(), branchType, branchName);
            log.info("Auto-fix triggered automatically for ticket #{}", ticket.getId());
        } catch (Exception e) {
            log.error("Auto-fix failed for ticket #{}: {}", ticket.getId(), e.getMessage());
        }
    }
}
