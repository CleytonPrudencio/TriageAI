package com.triageai.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "empresas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Empresa {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(unique = true)
    private String documento;

    @Column(nullable = false)
    private String tipoDocumento;

    private String email;
    private String telefone;
    private String endereco;

    @Column(nullable = false)
    private String plano;

    private int limiteTicketsMes = 50;
    private int limiteUsuarios = 3;
    private int limiteSistemas = 1;
    private int limiteAnalisesClaude = 0;

    @Column(precision = 10, scale = 2)
    private BigDecimal precoMensal = BigDecimal.ZERO;

    private boolean ativo = true;

    private LocalDateTime createdAt;
    private LocalDateTime trialEndsAt;

    @Transient
    private int ticketsUsadosMes;

    public int getDiasRestantesTrial() {
        if (trialEndsAt == null) return 0;
        long dias = ChronoUnit.DAYS.between(LocalDateTime.now(), trialEndsAt);
        return dias > 0 ? (int) dias : 0;
    }

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        applyPlanLimits();
    }

    private void applyPlanLimits() {
        switch (plano != null ? plano : "FREE") {
            case "FREE" -> {
                limiteTicketsMes = 50;
                limiteUsuarios = 3;
                limiteSistemas = 1;
                limiteAnalisesClaude = 0;
                precoMensal = BigDecimal.ZERO;
            }
            case "PRO" -> {
                limiteTicketsMes = 500;
                limiteUsuarios = 10;
                limiteSistemas = 5;
                limiteAnalisesClaude = 0;
                precoMensal = new BigDecimal("99");
            }
            case "BUSINESS" -> {
                limiteTicketsMes = Integer.MAX_VALUE;
                limiteUsuarios = Integer.MAX_VALUE;
                limiteSistemas = Integer.MAX_VALUE;
                limiteAnalisesClaude = 0;
                precoMensal = new BigDecimal("299");
            }
            case "BUSINESS_CLAUDE" -> {
                limiteTicketsMes = Integer.MAX_VALUE;
                limiteUsuarios = Integer.MAX_VALUE;
                limiteSistemas = Integer.MAX_VALUE;
                limiteAnalisesClaude = 15;
                precoMensal = new BigDecimal("500");
            }
            case "ENTERPRISE" -> {
                limiteTicketsMes = Integer.MAX_VALUE;
                limiteUsuarios = Integer.MAX_VALUE;
                limiteSistemas = Integer.MAX_VALUE;
                limiteAnalisesClaude = 100;
                precoMensal = new BigDecimal("999");
            }
        }
    }
}
