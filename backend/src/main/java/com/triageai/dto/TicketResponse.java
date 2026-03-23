package com.triageai.dto;

import com.triageai.model.Ticket;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TicketResponse {
    private Long id;
    private String titulo;
    private String descricao;
    private String categoria;
    private String prioridade;
    private String status;
    private Double aiScore;
    private String userName;
    private String assignedToName;
    private String prBranch;
    private String prUrl;
    private String prStatus;
    private String prSummary;
    private Long sistemaId;
    private String sistemaNome;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TicketResponse from(Ticket t) {
        TicketResponse r = new TicketResponse();
        r.setId(t.getId());
        r.setTitulo(t.getTitulo());
        r.setDescricao(t.getDescricao());
        r.setCategoria(t.getCategoria() != null ? t.getCategoria().name() : null);
        r.setPrioridade(t.getPrioridade() != null ? t.getPrioridade().name() : null);
        r.setStatus(t.getStatus().name());
        r.setAiScore(t.getAiScore());
        r.setUserName(t.getUser() != null ? t.getUser().getName() : null);
        r.setAssignedToName(t.getAssignedTo() != null ? t.getAssignedTo().getName() : null);
        r.setPrBranch(t.getPrBranch());
        r.setPrUrl(t.getPrUrl());
        r.setPrStatus(t.getPrStatus());
        r.setPrSummary(t.getPrSummary());
        r.setSistemaId(t.getSistema() != null ? t.getSistema().getId() : null);
        r.setSistemaNome(t.getSistema() != null ? t.getSistema().getNome() : null);
        r.setCreatedAt(t.getCreatedAt());
        r.setUpdatedAt(t.getUpdatedAt());
        return r;
    }
}
