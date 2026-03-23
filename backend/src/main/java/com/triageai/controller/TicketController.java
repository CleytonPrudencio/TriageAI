package com.triageai.controller;

import com.triageai.dto.FeedbackRequest;
import com.triageai.dto.TicketRequest;
import com.triageai.dto.TicketResponse;
import com.triageai.model.User;
import com.triageai.model.enums.Category;
import com.triageai.model.enums.Priority;
import com.triageai.model.enums.Status;
import com.triageai.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    public ResponseEntity<TicketResponse> create(
            @Valid @RequestBody TicketRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.create(request, user));
    }

    @GetMapping
    public ResponseEntity<Page<TicketResponse>> findAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String prioridade,
            @RequestParam(required = false) String categoria,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        if (status != null) {
            return ResponseEntity.ok(ticketService.findByStatus(Status.valueOf(status), pageable));
        }
        if (prioridade != null) {
            return ResponseEntity.ok(ticketService.findByPrioridade(Priority.valueOf(prioridade), pageable));
        }
        if (categoria != null) {
            return ResponseEntity.ok(ticketService.findByCategoria(Category.valueOf(categoria), pageable));
        }
        return ResponseEntity.ok(ticketService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TicketResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TicketRequest request) {
        return ResponseEntity.ok(ticketService.update(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ticketService.updateStatus(id, status));
    }

    @PutMapping("/{id}/feedback")
    public ResponseEntity<TicketResponse> feedback(
            @PathVariable Long id,
            @RequestBody FeedbackRequest request) {
        return ResponseEntity.ok(ticketService.feedback(id, request));
    }

    @PutMapping("/{id}/reclassify")
    public ResponseEntity<TicketResponse> reclassify(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.reclassify(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ticketService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
