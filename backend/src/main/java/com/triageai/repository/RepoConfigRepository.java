package com.triageai.repository;

import com.triageai.model.RepoConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepoConfigRepository extends JpaRepository<RepoConfig, Long> {
}
