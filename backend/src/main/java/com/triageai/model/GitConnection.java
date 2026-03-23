package com.triageai.model;

import com.triageai.model.enums.GitProvider;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "git_connections", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "provider"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GitConnection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GitProvider provider;

    @Column(nullable = false)
    private String apiToken;

    private String username;
    private String avatarUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDateTime connectedAt;

    @PrePersist
    protected void onCreate() {
        connectedAt = LocalDateTime.now();
    }
}
