package com.triageai.controller;

import com.triageai.dto.RepoConfigRequest;
import com.triageai.dto.RepoConfigResponse;
import com.triageai.model.GitConnection;
import com.triageai.model.RepoConfig;
import com.triageai.model.enums.GitProvider;
import com.triageai.repository.GitConnectionRepository;
import com.triageai.repository.RepoConfigRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repo-configs")
@RequiredArgsConstructor
@Tag(name = "Repositorios", description = "Configuracao de repositorios Git para integracao com auto-fix")
public class RepoConfigController {

    private final RepoConfigRepository repository;
    private final GitConnectionRepository gitConnectionRepository;

    @PostMapping
    @Operation(summary = "Configurar repositorio", description = "Cadastra um repositorio Git para uso no auto-fix. Se o apiToken nao for informado, usa o token da conexao Git ativa.")
    public ResponseEntity<RepoConfigResponse> create(@Valid @RequestBody RepoConfigRequest request) {
        // If apiToken not provided, fetch from GitConnection
        String token = request.getApiToken();
        if (token == null || token.isBlank()) {
            GitProvider provider = GitProvider.valueOf(request.getProvider());
            token = gitConnectionRepository.findFirstByProvider(provider)
                    .map(GitConnection::getApiToken)
                    .orElse("");
        }

        RepoConfig config = RepoConfig.builder()
                .name(request.getName())
                .provider(GitProvider.valueOf(request.getProvider()))
                .repoOwner(request.getRepoOwner())
                .repoName(request.getRepoName())
                .apiToken(token)
                .defaultBranch(request.getDefaultBranch() != null ? request.getDefaultBranch() : "main")
                .reviewerUsername(request.getReviewerUsername())
                .build();

        return ResponseEntity.ok(RepoConfigResponse.from(repository.save(config)));
    }

    @GetMapping
    @Operation(summary = "Listar repositorios", description = "Lista todos os repositorios configurados com provider, owner, nome e branch padrao.")
    public ResponseEntity<List<RepoConfigResponse>> findAll() {
        return ResponseEntity.ok(
                repository.findAll().stream().map(RepoConfigResponse::from).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar repositorio por ID", description = "Retorna detalhes da configuracao de um repositorio especifico.")
    public ResponseEntity<RepoConfigResponse> findById(@PathVariable Long id) {
        return repository.findById(id)
                .map(rc -> ResponseEntity.ok(RepoConfigResponse.from(rc)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar repositorio", description = "Atualiza configuracao do repositorio: provider, owner, nome, token, branch padrao e reviewer.")
    public ResponseEntity<RepoConfigResponse> update(@PathVariable Long id,
                                                     @Valid @RequestBody RepoConfigRequest request) {
        RepoConfig config = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Config nao encontrada"));

        config.setName(request.getName());
        config.setProvider(GitProvider.valueOf(request.getProvider()));
        config.setRepoOwner(request.getRepoOwner());
        config.setRepoName(request.getRepoName());
        config.setApiToken(request.getApiToken());
        config.setDefaultBranch(request.getDefaultBranch());
        config.setReviewerUsername(request.getReviewerUsername());

        return ResponseEntity.ok(RepoConfigResponse.from(repository.save(config)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remover repositorio", description = "Remove configuracao do repositorio. Sistemas vinculados perdem a referencia ao repo.")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
