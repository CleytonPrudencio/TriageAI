package com.triageai.repository;

import com.triageai.model.GitConnection;
import com.triageai.model.enums.GitProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GitConnectionRepository extends JpaRepository<GitConnection, Long> {
    List<GitConnection> findByUserId(Long userId);
    Optional<GitConnection> findByUserIdAndProvider(Long userId, GitProvider provider);
    Optional<GitConnection> findFirstByProvider(GitProvider provider);
}
