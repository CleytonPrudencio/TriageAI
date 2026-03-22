package com.triageai.service;

import com.triageai.dto.*;
import com.triageai.model.Ticket;
import com.triageai.model.User;
import com.triageai.model.enums.Category;
import com.triageai.model.enums.Priority;
import com.triageai.model.enums.Status;
import com.triageai.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final AiService aiService;

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

    public void delete(Long id) {
        ticketRepository.deleteById(id);
    }

    public DashboardStats getStats() {
        DashboardStats stats = new DashboardStats();
        stats.setTotalTickets(ticketRepository.count());

        stats.setByCategoria(new java.util.LinkedHashMap<>());
        ticketRepository.countByCategoriagrouped().forEach(row ->
                stats.getByCategoria().put(row[0].toString(), (Long) row[1]));

        stats.setByPrioridade(new java.util.LinkedHashMap<>());
        ticketRepository.countByPrioridadeGrouped().forEach(row ->
                stats.getByPrioridade().put(row[0].toString(), (Long) row[1]));

        stats.setByStatus(new java.util.LinkedHashMap<>());
        ticketRepository.countByStatusGrouped().forEach(row ->
                stats.getByStatus().put(row[0].toString(), (Long) row[1]));

        return stats;
    }
}
