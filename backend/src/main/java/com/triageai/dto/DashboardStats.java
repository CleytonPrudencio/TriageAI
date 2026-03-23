package com.triageai.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class DashboardStats {
    private long totalTickets;
    private long ticketsHoje;
    private long ticketsSemana;
    private long ticketsMes;
    private Map<String, Long> byCategoria;
    private Map<String, Long> byPrioridade;
    private Map<String, Long> byStatus;

    // AI metrics
    private double mediaAiScore;
    private int iaModelVersion;
    private double iaAccuracy;
    private double iaF1Score;
    private int iaDatasetSize;
    private String iaTrainedAt;

    // PR metrics
    private long totalPRs;
    private long prsMerged;
    private long prsOpen;
    private long prsClosed;

    // Recent tickets
    private List<TicketResponse> ticketsRecentes;
}
