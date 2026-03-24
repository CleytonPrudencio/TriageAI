package com.triageai.repository;

import com.triageai.model.Sistema;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SistemaRepository extends JpaRepository<Sistema, Long> {
    List<Sistema> findAllByOrderByNomeAsc();
    List<Sistema> findByEmpresaIdOrderByNomeAsc(Long empresaId);
    List<Sistema> findByOwnerUserIdOrderByNomeAsc(Long userId);
}
