package com.triageai.model;

import com.triageai.model.enums.GitProvider;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "repo_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RepoConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GitProvider provider;

    @Column(nullable = false)
    private String repoOwner;

    @Column(nullable = false)
    private String repoName;

    @Column(nullable = false)
    private String apiToken;

    @Column(nullable = false)
    private String defaultBranch;

    private String reviewerUsername;
}
