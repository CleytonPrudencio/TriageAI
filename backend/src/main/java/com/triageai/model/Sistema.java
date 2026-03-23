package com.triageai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sistemas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Sistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome; // "ERP Financeiro", "Portal do Cliente"

    private String descricao;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "repo_config_id")
    private RepoConfig repoConfig;

    private String targetBranch; // branch alvo, pode ser diferente da default do repo

    private boolean autoFixEnabled = false; // auto-fix roda automaticamente

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); }
}
