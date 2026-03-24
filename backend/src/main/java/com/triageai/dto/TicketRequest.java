package com.triageai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TicketRequest {
    @NotBlank
    private String titulo;

    @NotBlank @Size(min = 10, max = 2000)
    private String descricao;

    private Long sistemaId;

    // Optional: pre-classification from enrich step (if provided, skip ML prediction)
    private String categoria;
    private String prioridade;
    private Double aiScore;
}
