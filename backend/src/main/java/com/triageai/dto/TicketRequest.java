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
}
