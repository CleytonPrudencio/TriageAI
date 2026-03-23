package com.triageai.service;

import com.triageai.model.Ticket;
import com.triageai.model.enums.Status;
import com.triageai.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class PrStatusSyncService {

    private final TicketRepository ticketRepository;
    private final GitProviderService gitProviderService;

    @Scheduled(fixedRate = 60000) // Every 60 seconds
    @Transactional
    public void syncPrStatuses() {
        List<Ticket> ticketsWithOpenPr = ticketRepository.findByPrStatus("OPEN");

        if (ticketsWithOpenPr.isEmpty()) return;

        log.debug("Checking {} open PRs", ticketsWithOpenPr.size());

        for (Ticket ticket : ticketsWithOpenPr) {
            if (ticket.getPrUrl() == null || ticket.getRepoConfig() == null) continue;

            try {
                String prStatus = gitProviderService.getPrStatus(ticket.getRepoConfig(), ticket.getPrUrl());

                switch (prStatus) {
                    case "approved" -> {
                        ticket.setPrStatus("APPROVED");
                        ticket.setStatus(Status.CODE_REVIEW);
                        ticketRepository.save(ticket);
                        log.info("Ticket #{} PR approved -> CODE_REVIEW", ticket.getId());
                    }
                    case "merged" -> {
                        ticket.setPrStatus("MERGED");
                        ticket.setStatus(Status.RESOLVIDO);
                        ticketRepository.save(ticket);
                        log.info("Ticket #{} PR merged -> RESOLVIDO", ticket.getId());
                    }
                    case "closed" -> {
                        ticket.setPrStatus("CLOSED");
                        ticket.setStatus(Status.ABERTO);
                        ticketRepository.save(ticket);
                        log.info("Ticket #{} PR closed -> ABERTO", ticket.getId());
                    }
                    // "open" -> no change needed
                }
            } catch (Exception e) {
                log.warn("Failed to sync PR status for ticket #{}: {}", ticket.getId(), e.getMessage());
            }
        }
    }
}
