package com.triageai.repository;

import com.triageai.model.RepoConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepoConfigRepository extends JpaRepository<RepoConfig, Long> {
    List<RepoConfig> findByEmpresaId(Long empresaId);
    List<RepoConfig> findByOwnerUserId(Long userId);
    List<RepoConfig> findByEmpresaIdOrOwnerUserId(Long empresaId, Long userId);
}
