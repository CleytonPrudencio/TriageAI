package com.triageai.repository;

import com.triageai.model.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {
    Optional<Empresa> findByDocumento(String documento);
    boolean existsByDocumento(String documento);
    long countByAtivoTrue();
    long countByPlano(String plano);
}
