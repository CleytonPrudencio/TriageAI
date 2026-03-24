package com.triageai.repository;

import com.triageai.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByEmpresaId(Long empresaId);
    List<User> findByEmpresaId(Long empresaId);
}
