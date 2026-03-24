package com.triageai.controller;

import com.triageai.model.Empresa;
import com.triageai.model.User;
import com.triageai.model.enums.Role;
import com.triageai.repository.EmpresaRepository;
import com.triageai.repository.TicketRepository;
import com.triageai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final EmpresaRepository empresaRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;

    // ========== STATS ==========
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        long totalEmpresas = empresaRepository.count();
        long empresasAtivas = empresaRepository.countByAtivoTrue();
        long totalUsers = userRepository.count();
        long totalTickets = ticketRepository.count();

        BigDecimal receitaMensal = empresaRepository.findAll().stream()
                .filter(Empresa::isAtivo)
                .map(e -> e.getPrecoMensal() != null ? e.getPrecoMensal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> porPlano = new LinkedHashMap<>();
        porPlano.put("FREE", empresaRepository.countByPlano("FREE"));
        porPlano.put("PRO", empresaRepository.countByPlano("PRO"));
        porPlano.put("BUSINESS", empresaRepository.countByPlano("BUSINESS"));
        porPlano.put("BUSINESS_CLAUDE", empresaRepository.countByPlano("BUSINESS_CLAUDE"));
        porPlano.put("ENTERPRISE", empresaRepository.countByPlano("ENTERPRISE"));

        LocalDateTime hoje = LocalDate.now().atStartOfDay();
        LocalDateTime inicioSemana = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);

        long ticketsHoje = ticketRepository.countByCreatedAtAfter(hoje);
        long ticketsSemana = ticketRepository.countByCreatedAtAfter(inicioSemana);

        // Recent empresas (last 5 created)
        List<Map<String, Object>> recentEmpresas = empresaRepository.findAll().stream()
                .filter(e -> e.getCreatedAt() != null)
                .sorted(Comparator.comparing(Empresa::getCreatedAt).reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", e.getId());
                    m.put("nome", e.getNome());
                    m.put("plano", e.getPlano());
                    m.put("createdAt", e.getCreatedAt().toString());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalEmpresas", totalEmpresas);
        result.put("empresasAtivas", empresasAtivas);
        result.put("totalUsuarios", totalUsers);
        result.put("totalTickets", totalTickets);
        result.put("receitaMensal", receitaMensal);
        result.put("porPlano", porPlano);
        result.put("ticketsHoje", ticketsHoje);
        result.put("ticketsSemana", ticketsSemana);
        result.put("recentEmpresas", recentEmpresas);

        return ResponseEntity.ok(result);
    }

    // ========== EMPRESAS CRUD ==========
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
            map.put("telefone", e.getTelefone());
            map.put("endereco", e.getEndereco());
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

    @GetMapping("/empresas/{id}")
    public ResponseEntity<?> getEmpresa(@PathVariable Long id) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));
        List<User> users = userRepository.findByEmpresaId(id);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("nome", e.getNome());
        map.put("documento", e.getDocumento());
        map.put("tipoDocumento", e.getTipoDocumento());
        map.put("email", e.getEmail());
        map.put("telefone", e.getTelefone());
        map.put("endereco", e.getEndereco());
        map.put("plano", e.getPlano());
        map.put("ativo", e.isAtivo());
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        map.put("limiteTicketsMes", e.getLimiteTicketsMes());
        map.put("limiteUsuarios", e.getLimiteUsuarios());
        map.put("limiteSistemas", e.getLimiteSistemas());
        map.put("limiteAnalisesClaude", e.getLimiteAnalisesClaude());
        map.put("precoMensal", e.getPrecoMensal());

        List<Map<String, Object>> userList = users.stream().map(u -> {
            Map<String, Object> um = new LinkedHashMap<>();
            um.put("id", u.getId());
            um.put("name", u.getName());
            um.put("email", u.getEmail());
            um.put("role", u.getRole().name());
            return um;
        }).toList();
        map.put("usuarios", userList);
        map.put("totalUsuarios", users.size());

        return ResponseEntity.ok(map);
    }

    @PostMapping("/empresas")
    public ResponseEntity<?> createEmpresa(@RequestBody Map<String, String> body) {
        String documento = body.get("documento");
        if (documento != null && empresaRepository.existsByDocumento(documento)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Documento ja cadastrado"));
        }

        Empresa e = new Empresa();
        e.setNome(body.get("nome"));
        e.setDocumento(documento);
        e.setTipoDocumento(body.getOrDefault("tipoDocumento", "CNPJ"));
        e.setEmail(body.get("email"));
        e.setTelefone(body.get("telefone"));
        e.setPlano(body.getOrDefault("plano", "FREE"));
        e.setAtivo(true);

        empresaRepository.save(e);
        log.info("Admin created empresa: {} ({})", e.getNome(), e.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Empresa criada com sucesso");
        result.put("id", e.getId());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/empresas/{id}")
    public ResponseEntity<?> updateEmpresa(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));

        if (body.containsKey("nome")) e.setNome(body.get("nome"));
        if (body.containsKey("email")) e.setEmail(body.get("email"));
        if (body.containsKey("telefone")) e.setTelefone(body.get("telefone"));
        if (body.containsKey("endereco")) e.setEndereco(body.get("endereco"));
        if (body.containsKey("plano")) {
            e.setPlano(body.get("plano"));
            applyPlanLimits(e);
        }

        empresaRepository.save(e);
        log.info("Admin updated empresa: {} ({})", e.getNome(), e.getId());
        return ResponseEntity.ok(Map.of("message", "Empresa atualizada com sucesso"));
    }

    @DeleteMapping("/empresas/{id}")
    public ResponseEntity<?> deleteEmpresa(@PathVariable Long id) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));
        e.setAtivo(false);
        empresaRepository.save(e);
        log.info("Admin soft-deleted empresa: {} ({})", e.getNome(), e.getId());
        return ResponseEntity.ok(Map.of("message", "Empresa desativada com sucesso"));
    }

    @PutMapping("/empresas/{id}/plano")
    public ResponseEntity<?> updatePlano(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));
        String plano = body.get("plano");
        e.setPlano(plano);
        applyPlanLimits(e);
        empresaRepository.save(e);
        log.info("Admin changed plan for empresa {} to {}", e.getId(), plano);
        return ResponseEntity.ok(Map.of("message", "Plano atualizado para " + plano));
    }

    @PutMapping("/empresas/{id}/toggle")
    public ResponseEntity<?> toggleEmpresa(@PathVariable Long id) {
        Empresa e = empresaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa not found"));
        e.setAtivo(!e.isAtivo());
        empresaRepository.save(e);
        log.info("Admin toggled empresa {} to {}", e.getId(), e.isAtivo() ? "active" : "inactive");
        return ResponseEntity.ok(Map.of(
                "message", e.isAtivo() ? "Empresa ativada" : "Empresa desativada",
                "ativo", e.isAtivo()
        ));
    }

    // ========== USUARIOS CRUD ==========
    @GetMapping("/usuarios")
    public ResponseEntity<?> listUsuarios() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = users.stream().map(u -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole().name());
            map.put("empresaId", u.getEmpresa() != null ? u.getEmpresa().getId() : null);
            map.put("empresaNome", u.getEmpresa() != null ? u.getEmpresa().getNome() : null);
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/usuarios/{id}")
    public ResponseEntity<?> getUsuario(@PathVariable Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("role", u.getRole().name());
        map.put("empresaId", u.getEmpresa() != null ? u.getEmpresa().getId() : null);
        map.put("empresaNome", u.getEmpresa() != null ? u.getEmpresa().getNome() : null);
        return ResponseEntity.ok(map);
    }

    @PostMapping("/usuarios")
    public ResponseEntity<?> createUsuario(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email ja cadastrado"));
        }

        User u = new User();
        u.setName(body.get("name"));
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(body.get("password")));
        u.setRole(Role.valueOf(body.getOrDefault("role", "CLIENT")));

        String empresaIdStr = body.get("empresaId");
        if (empresaIdStr != null && !empresaIdStr.isEmpty()) {
            Empresa empresa = empresaRepository.findById(Long.parseLong(empresaIdStr))
                    .orElseThrow(() -> new RuntimeException("Empresa not found"));
            u.setEmpresa(empresa);
        }

        userRepository.save(u);
        log.info("Admin created user: {} ({})", u.getEmail(), u.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Usuario criado com sucesso");
        result.put("id", u.getId());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/usuarios/{id}")
    public ResponseEntity<?> updateUsuario(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));

        if (body.containsKey("name")) u.setName(body.get("name"));
        if (body.containsKey("email")) u.setEmail(body.get("email"));
        if (body.containsKey("role")) u.setRole(Role.valueOf(body.get("role")));

        String empresaIdStr = body.get("empresaId");
        if (empresaIdStr != null) {
            if (empresaIdStr.isEmpty()) {
                u.setEmpresa(null);
            } else {
                Empresa empresa = empresaRepository.findById(Long.parseLong(empresaIdStr))
                        .orElseThrow(() -> new RuntimeException("Empresa not found"));
                u.setEmpresa(empresa);
            }
        }

        userRepository.save(u);
        log.info("Admin updated user: {} ({})", u.getEmail(), u.getId());
        return ResponseEntity.ok(Map.of("message", "Usuario atualizado com sucesso"));
    }

    @PutMapping("/usuarios/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Senha deve ter pelo menos 6 caracteres"));
        }
        u.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(u);
        log.info("Admin reset password for user: {} ({})", u.getEmail(), u.getId());
        return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
    }

    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<?> deleteUsuario(@PathVariable Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));
        userRepository.delete(u);
        log.info("Admin deleted user: {} ({})", u.getEmail(), id);
        return ResponseEntity.ok(Map.of("message", "Usuario excluido com sucesso"));
    }

    @PutMapping("/usuarios/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));
        String roleStr = body.get("role");
        u.setRole(Role.valueOf(roleStr));
        userRepository.save(u);
        log.info("Admin changed role for user {} to {}", u.getId(), roleStr);
        return ResponseEntity.ok(Map.of("message", "Role alterada para " + roleStr));
    }

    // ========== EMPRESAS USUARIOS (kept for backward compat) ==========
    @GetMapping("/empresas/{empresaId}/usuarios")
    public ResponseEntity<?> listUsuariosByEmpresa(@PathVariable Long empresaId) {
        List<User> users = userRepository.findByEmpresaId(empresaId);
        return ResponseEntity.ok(users.stream().map(u -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole().name());
            return map;
        }).toList());
    }

    // ========== PLANOS ==========
    @GetMapping("/planos")
    public ResponseEntity<?> listPlanos() {
        List<Map<String, Object>> planos = new ArrayList<>();

        planos.add(buildPlano("FREE", "Free", BigDecimal.ZERO, 50, 3, 1, 0,
                List.of("Triage basico", "1 sistema", "Ate 3 usuarios")));

        planos.add(buildPlano("PRO", "Pro", new BigDecimal("99"), 500, 10, 5, 0,
                List.of("Triage avancado", "5 sistemas", "Ate 10 usuarios", "Integracao GitHub")));

        planos.add(buildPlano("BUSINESS", "Business", new BigDecimal("299"), Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE, 0,
                List.of("Tudo do Pro", "Sistemas ilimitados", "Usuarios ilimitados", "Suporte prioritario")));

        planos.add(buildPlano("BUSINESS_CLAUDE", "Business + Claude", new BigDecimal("500"), Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE, 15,
                List.of("Tudo do Business", "15 analises Claude/mes", "Auto-fix com IA", "Code review automatico")));

        planos.add(buildPlano("ENTERPRISE", "Enterprise", new BigDecimal("999"), Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE, 100,
                List.of("Tudo do Business+Claude", "100 analises Claude/mes", "SLA dedicado", "Customizacoes")));

        // Add empresa count per plan
        for (Map<String, Object> p : planos) {
            String key = (String) p.get("key");
            p.put("empresasCount", empresaRepository.countByPlano(key));
        }

        return ResponseEntity.ok(planos);
    }

    // ========== HELPERS ==========
    private Map<String, Object> buildPlano(String key, String nome, BigDecimal preco,
                                           int tickets, int usuarios, int sistemas, int claude,
                                           List<String> features) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("key", key);
        map.put("nome", nome);
        map.put("preco", preco);
        map.put("limiteTickets", tickets);
        map.put("limiteUsuarios", usuarios);
        map.put("limiteSistemas", sistemas);
        map.put("limiteAnalisesClaude", claude);
        map.put("features", features);
        return map;
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
