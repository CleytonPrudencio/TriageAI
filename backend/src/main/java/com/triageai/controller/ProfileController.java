package com.triageai.controller;

import com.triageai.model.Empresa;
import com.triageai.model.User;
import com.triageai.repository.EmpresaRepository;
import com.triageai.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Perfil", description = "Gerenciamento de perfil do usuario e dados da empresa")
public class ProfileController {

    private final UserRepository userRepository;
    private final EmpresaRepository empresaRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @Operation(summary = "Meu perfil", description = "Retorna dados do usuario logado incluindo nome, email, role e informacoes da empresa (plano, limites).")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());

        if (user.getEmpresa() != null) {
            Empresa e = user.getEmpresa();
            profile.put("empresa", Map.of(
                    "id", e.getId(),
                    "nome", e.getNome(),
                    "documento", e.getDocumento(),
                    "tipoDocumento", e.getTipoDocumento(),
                    "plano", e.getPlano(),
                    "limiteTicketsMes", e.getLimiteTicketsMes(),
                    "limiteUsuarios", e.getLimiteUsuarios(),
                    "limiteSistemas", e.getLimiteSistemas()
            ));
        }

        return ResponseEntity.ok(profile);
    }

    @PutMapping
    @Operation(summary = "Atualizar perfil", description = "Atualiza nome e/ou senha do usuario logado. Envie apenas os campos que deseja alterar.")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal UserDetails userDetails, @RequestBody Map<String, String> body) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (body.containsKey("name")) user.setName(body.get("name"));
        if (body.containsKey("password") && !body.get("password").isBlank()) {
            user.setPassword(passwordEncoder.encode(body.get("password")));
        }
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Perfil atualizado"));
    }

    @PutMapping("/empresa")
    @Operation(summary = "Atualizar empresa", description = "Atualiza dados da empresa do usuario logado: nome, telefone e endereco.")
    public ResponseEntity<?> updateEmpresa(@AuthenticationPrincipal UserDetails userDetails, @RequestBody Map<String, String> body) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getEmpresa() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario sem empresa"));
        }

        Empresa e = user.getEmpresa();
        if (body.containsKey("nome")) e.setNome(body.get("nome"));
        if (body.containsKey("telefone")) e.setTelefone(body.get("telefone"));
        if (body.containsKey("endereco")) e.setEndereco(body.get("endereco"));
        empresaRepository.save(e);

        return ResponseEntity.ok(Map.of("message", "Empresa atualizada"));
    }

    @PutMapping("/plano")
    @Operation(summary = "Upgrade de plano", description = "Faz upgrade do plano da empresa para PREMIUM com limites ilimitados de tickets, usuarios e sistemas.")
    public ResponseEntity<?> upgradePlano(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getEmpresa() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario sem empresa"));
        }

        Empresa e = user.getEmpresa();
        e.setPlano("PREMIUM");
        e.setLimiteTicketsMes(Integer.MAX_VALUE);
        e.setLimiteUsuarios(Integer.MAX_VALUE);
        e.setLimiteSistemas(Integer.MAX_VALUE);
        empresaRepository.save(e);

        return ResponseEntity.ok(Map.of("message", "Plano atualizado para PREMIUM!", "plano", "PREMIUM"));
    }
}
