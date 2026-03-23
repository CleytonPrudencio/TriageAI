package com.triageai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "api_keys")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiKey {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String keyHash; // SHA-256 of the actual key

    @Column(nullable = false)
    private String name; // "Jira Integration", "Zendesk Prod"

    @Column(nullable = false)
    private String prefix; // first 8 chars of key for identification: "trai_abc1..."

    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User createdBy;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); }
}
