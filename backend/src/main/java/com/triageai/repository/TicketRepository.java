package com.triageai.repository;

import com.triageai.model.Ticket;
import com.triageai.model.enums.Category;
import com.triageai.model.enums.Priority;
import com.triageai.model.enums.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Page<Ticket> findByStatus(Status status, Pageable pageable);
    Page<Ticket> findByPrioridade(Priority prioridade, Pageable pageable);
    Page<Ticket> findByCategoria(Category categoria, Pageable pageable);
    Page<Ticket> findByUserId(Long userId, Pageable pageable);

    long countByStatus(Status status);
    long countByPrioridade(Priority prioridade);
    long countByCategoria(Category categoria);

    @Query("SELECT t.categoria, COUNT(t) FROM Ticket t GROUP BY t.categoria")
    List<Object[]> countByCategoriagrouped();

    @Query("SELECT t.prioridade, COUNT(t) FROM Ticket t GROUP BY t.prioridade")
    List<Object[]> countByPrioridadeGrouped();

    @Query("SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status")
    List<Object[]> countByStatusGrouped();

    List<Ticket> findByPrStatus(String prStatus);

    long countByCreatedAtAfter(LocalDateTime date);

    @Query("SELECT COALESCE(AVG(t.aiScore), 0) FROM Ticket t WHERE t.aiScore IS NOT NULL")
    double avgAiScore();

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.prUrl IS NOT NULL")
    long countWithPr();

    @Query("SELECT t.prStatus, COUNT(t) FROM Ticket t WHERE t.prStatus IS NOT NULL GROUP BY t.prStatus")
    List<Object[]> countByPrStatusGrouped();

    List<Ticket> findTop10ByOrderByCreatedAtDesc();
}
