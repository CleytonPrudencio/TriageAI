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

    // Branch de origem por tipo - cada tipo de branch pode sair de uma branch diferente
    private String branchHotfix = "main";    // hotfix sai da main (producao)
    private String branchBugfix = "develop"; // bugfix sai da develop
    private String branchFix = "develop";    // fix sai da develop
    private String branchFeat = "develop";   // feat sai da develop
    private String branchRefactor = "develop";
    private String branchDocs = "develop";
    private String branchChore = "develop";

    private boolean autoFixEnabled = false; // auto-fix roda automaticamente

    private String defaultReviewer; // username do reviewer padrao no GitHub

    /**
     * Retorna a branch de origem baseada no tipo de branch
     */
    public String getSourceBranch(String branchType) {
        return switch (branchType) {
            case "hotfix" -> branchHotfix != null ? branchHotfix : "main";
            case "bugfix" -> branchBugfix != null ? branchBugfix : "develop";
            case "fix" -> branchFix != null ? branchFix : "develop";
            case "feat" -> branchFeat != null ? branchFeat : "develop";
            case "refactor" -> branchRefactor != null ? branchRefactor : "develop";
            case "docs" -> branchDocs != null ? branchDocs : "develop";
            case "chore" -> branchChore != null ? branchChore : "develop";
            default -> "develop";
        };
    }

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); }
}
