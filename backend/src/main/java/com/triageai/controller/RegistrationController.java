package com.triageai.controller;

import com.triageai.model.Empresa;
import com.triageai.model.User;
import com.triageai.model.enums.Role;
import com.triageai.repository.EmpresaRepository;
import com.triageai.repository.UserRepository;
import com.triageai.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/register")
@RequiredArgsConstructor
@Tag(name = "Registro", description = "Cadastro de novas empresas e usuarios. Endpoint publico.")
public class RegistrationController {

    private final EmpresaRepository empresaRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @PostMapping
    @Operation(summary = "Registrar empresa e usuario", description = "Cadastra nova empresa com usuario administrador. Valida CPF/CNPJ, verifica duplicidade de documento e email. Retorna token JWT para acesso imediato. Planos disponiveis: FREE, PRO, BUSINESS, BUSINESS_CLAUDE, ENTERPRISE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Empresa e usuario criados com sucesso. Retorna token JWT, dados do usuario e empresa."),
            @ApiResponse(responseCode = "400", description = "CPF/CNPJ invalido, documento ja cadastrado ou email duplicado")
    })
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        String doc = req.getDocumento().replaceAll("[^0-9]", "");
        if (doc.length() != 11 && doc.length() != 14) {
            return ResponseEntity.badRequest().body(Map.of("error", "CPF deve ter 11 digitos e CNPJ 14 digitos"));
        }

        if (!validarDocumento(doc)) {
            return ResponseEntity.badRequest().body(Map.of("error", "CPF/CNPJ invalido"));
        }

        if (empresaRepository.existsByDocumento(doc)) {
            return ResponseEntity.badRequest().body(Map.of("error", "CPF/CNPJ ja cadastrado"));
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email ja cadastrado"));
        }

        String tipoDoc = doc.length() == 11 ? "CPF" : "CNPJ";
        List<String> planosValidos = List.of("FREE", "PRO", "BUSINESS", "BUSINESS_CLAUDE", "ENTERPRISE");
        String plano = req.getPlano() != null && planosValidos.contains(req.getPlano()) ? req.getPlano() : "FREE";

        Empresa empresa = Empresa.builder()
                .nome(req.getNomeEmpresa())
                .documento(doc)
                .tipoDocumento(tipoDoc)
                .email(req.getEmail())
                .telefone(req.getTelefone())
                .plano(plano)
                .ativo(true)
                .build();
        empresa = empresaRepository.save(empresa);

        User user = User.builder()
                .name(req.getNomeUsuario())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getSenha()))
                .role(Role.ADMIN)
                .empresa(empresa)
                .build();
        user = userRepository.save(user);

        String token = tokenProvider.generateToken(user.getEmail());

        return ResponseEntity.ok(Map.of(
                "message", "Conta criada com sucesso!",
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole().name()
                ),
                "empresa", Map.of(
                        "id", empresa.getId(),
                        "nome", empresa.getNome(),
                        "plano", empresa.getPlano(),
                        "documento", empresa.getDocumento(),
                        "tipoDocumento", empresa.getTipoDocumento()
                )
        ));
    }

    private boolean validarDocumento(String doc) {
        if (doc.length() == 11) return validarCpf(doc);
        if (doc.length() == 14) return validarCnpj(doc);
        return false;
    }

    private boolean validarCpf(String cpf) {
        if (cpf.chars().distinct().count() == 1) return false;
        int[] pesos1 = {10, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] pesos2 = {11, 10, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int i = 0; i < 9; i++) soma += (cpf.charAt(i) - '0') * pesos1[i];
        int dig1 = 11 - (soma % 11);
        if (dig1 >= 10) dig1 = 0;
        if (dig1 != (cpf.charAt(9) - '0')) return false;
        soma = 0;
        for (int i = 0; i < 10; i++) soma += (cpf.charAt(i) - '0') * pesos2[i];
        int dig2 = 11 - (soma % 11);
        if (dig2 >= 10) dig2 = 0;
        return dig2 == (cpf.charAt(10) - '0');
    }

    private boolean validarCnpj(String cnpj) {
        if (cnpj.chars().distinct().count() == 1) return false;
        int[] pesos1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] pesos2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int i = 0; i < 12; i++) soma += (cnpj.charAt(i) - '0') * pesos1[i];
        int dig1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (dig1 != (cnpj.charAt(12) - '0')) return false;
        soma = 0;
        for (int i = 0; i < 13; i++) soma += (cnpj.charAt(i) - '0') * pesos2[i];
        int dig2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        return dig2 == (cnpj.charAt(13) - '0');
    }

    @Data
    public static class RegisterRequest {
        private String nomeEmpresa;
        private String documento;
        private String nomeUsuario;
        private String email;
        private String senha;
        private String telefone;
        private String plano;
    }
}
