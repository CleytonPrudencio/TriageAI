package com.triageai.controller;

import com.triageai.dto.AuthResponse;
import com.triageai.dto.LoginRequest;
import com.triageai.dto.RegisterRequest;
import com.triageai.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticacao", description = "Login e gerenciamento de sessao")
public class AuthController {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;

    @PostMapping("/register")
    @Operation(summary = "Registrar usuario", description = "Registra um novo usuario no sistema e retorna token JWT. O usuario e vinculado a empresa existente ou criado sem empresa.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario registrado com sucesso, retorna token JWT"),
            @ApiResponse(responseCode = "400", description = "Dados invalidos ou email ja cadastrado")
    })
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request, authenticationManager));
    }

    @PostMapping("/login")
    @Operation(summary = "Fazer login", description = "Autentica o usuario com email e senha e retorna um token JWT valido por 24h. Use o token no header Authorization: Bearer {token} para acessar endpoints protegidos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login bem sucedido, retorna token JWT e dados do usuario"),
            @ApiResponse(responseCode = "401", description = "Credenciais invalidas")
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request, authenticationManager));
    }
}
