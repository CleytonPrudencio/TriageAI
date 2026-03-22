package com.triageai.dto;

import lombok.Data;

@Data
public class FeedbackRequest {
    private String categoria;
    private String prioridade;
}
