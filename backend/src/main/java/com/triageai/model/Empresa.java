package com.triageai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    private boolean ativo = true;

    private LocalDateTime createdAt;
    private LocalDateTime trialEndsAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        if ("FREE".equals(plano)) {
            limiteTicketsMes = 50;
            limiteUsuarios = 3;
            limiteSistemas = 1;
        } else {
            limiteTicketsMes = Integer.MAX_VALUE;
            limiteUsuarios = Integer.MAX_VALUE;
            limiteSistemas = Integer.MAX_VALUE;
        }
    }
}
