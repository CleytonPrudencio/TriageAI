package com.triageai.controller;

import com.triageai.model.Empresa;
import com.triageai.model.User;
import com.triageai.repository.EmpresaRepository;
import com.triageai.repository.TicketRepository;
import com.triageai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final EmpresaRepository empresaRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;

    @GetMapping("/empresas")
    public ResponseEntity<?> listEmpresas() {
        List<Empresa> empresas = empresaRepository.findAll();
        List<Map<String, Object>> result = empresas.stream().map(e -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", e.getId());
            map.put("nome", e.getNome());
            map.put("documento", e.getDocumento());
            map.put("tipoDocumento", e.getTipoDocumento());
            map.put("email", e.getEmail());
            map.put("plano", e.getPlano());
            map.put("ativo", e.isAtivo());
            map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
            map.put("limiteTicketsMes", e.getLimiteTicketsMes());
            map.put("limiteUsuarios", e.getLimiteUsuarios());
            map.put("limiteSistemas", e.getLimiteSistemas());
            map.put("limiteAnalisesClaude", e.getLimiteAnalisesClaude());
            map.put("precoMensal", e.getPrecoMensal());
            long userCount = userRepository.countByEmpresaId(e.getId());
            map.put("totalUsuarios", userCount);
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/empresas/{empresaId}/usuarios")
    public ResponseEntity<?> listUsuariosByEmpresa(@PathVariable Long empresaId) {
        List<User> users = userRepository.findByEmpresaId(empresaId);
        return ResponseEntity.ok(users.stream().map(u -> Map.of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail(),
                "role", u.getRole().name(),
                "createdAt", ""
        )).toList());
    }

    @PutMapping("/empresas/{id}/plano")
    public ResponseEntity<?> updatePlano(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));
        String plano = body.get("plano");
        e.setPlano(plano);
        applyPlanLimits(e);
        empresaRepository.save(e);
        return ResponseEntity.ok(Map.of("message", "Plano atualizado para " + plano));
    }

    @PutMapping("/empresas/{id}/toggle")
    public ResponseEntity<?> toggleEmpresa(@PathVariable Long id) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));
        e.setAtivo(!e.isAtivo());
        empresaRepository.save(e);
        return ResponseEntity.ok(Map.of(
                "message", e.isAtivo() ? "Empresa ativada" : "Empresa desativada",
                "ativo", e.isAtivo()
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        long totalEmpresas = empresaRepository.count();
        long totalUsers = userRepository.count();
        long totalTickets = ticketRepository.count();
        long empresasAtivas = empresaRepository.countByAtivoTrue();

        Map<String, Long> byPlan = new LinkedHashMap<>();
        byPlan.put("FREE", empresaRepository.countByPlano("FREE"));
        byPlan.put("PRO", empresaRepository.countByPlano("PRO"));
        byPlan.put("BUSINESS", empresaRepository.countByPlano("BUSINESS"));
        byPlan.put("BUSINESS_CLAUDE", empresaRepository.countByPlano("BUSINESS_CLAUDE"));
        byPlan.put("ENTERPRISE", empresaRepository.countByPlano("ENTERPRISE"));

        return ResponseEntity.ok(Map.of(
                "totalEmpresas", totalEmpresas,
                "empresasAtivas", empresasAtivas,
                "totalUsuarios", totalUsers,
                "totalTickets", totalTickets,
                "porPlano", byPlan
        ));
    }

    private void applyPlanLimits(Empresa e) {
        switch (e.getPlano()) {
            case "FREE" -> {
                e.setLimiteTicketsMes(50);
                e.setLimiteUsuarios(3);
                e.setLimiteSistemas(1);
                e.setLimiteAnalisesClaude(0);
                e.setPrecoMensal(BigDecimal.ZERO);
            }
            case "PRO" -> {
                e.setLimiteTicketsMes(500);
                e.setLimiteUsuarios(10);
                e.setLimiteSistemas(5);
                e.setLimiteAnalisesClaude(0);
                e.setPrecoMensal(new BigDecimal("99"));
            }
            case "BUSINESS" -> {
                e.setLimiteTicketsMes(Integer.MAX_VALUE);
                e.setLimiteUsuarios(Integer.MAX_VALUE);
                e.setLimiteSistemas(Integer.MAX_VALUE);
                e.setLimiteAnalisesClaude(0);
                e.setPrecoMensal(new BigDecimal("299"));
            }
            case "BUSINESS_CLAUDE" -> {
                e.setLimiteTicketsMes(Integer.MAX_VALUE);
                e.setLimiteUsuarios(Integer.MAX_VALUE);
                e.setLimiteSistemas(Integer.MAX_VALUE);
                e.setLimiteAnalisesClaude(15);
                e.setPrecoMensal(new BigDecimal("500"));
            }
            case "ENTERPRISE" -> {
                e.setLimiteTicketsMes(Integer.MAX_VALUE);
                e.setLimiteUsuarios(Integer.MAX_VALUE);
                e.setLimiteSistemas(Integer.MAX_VALUE);
                e.setLimiteAnalisesClaude(100);
                e.setPrecoMensal(new BigDecimal("999"));
            }
        }
    }
}
