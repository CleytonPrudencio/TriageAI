package com.triageai.repository;

import com.triageai.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findByKeyHashAndActiveTrue(String keyHash);
    List<ApiKey> findByActiveTrue();
    Optional<ApiKey> findByPrefix(String prefix);
}
