package com.triageai.dto;

import lombok.Data;

import java.util.Map;

@Data
public class DashboardStats {
    private long totalTickets;
    private Map<String, Long> byCategoria;
    private Map<String, Long> byPrioridade;
    private Map<String, Long> byStatus;
}
