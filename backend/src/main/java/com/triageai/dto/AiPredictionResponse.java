package com.triageai.dto;

import lombok.Data;

@Data
public class AiPredictionResponse {
    private String categoria;
    private String prioridade;
    private Double score;
}
