package com.triageai.controller;

import com.triageai.dto.AutoFixResponse;
import com.triageai.dto.GitConnectionRequest;
import com.triageai.dto.GitConnectionResponse;
import com.triageai.dto.GitRepoResponse;
import com.triageai.model.GitConnection;
import com.triageai.model.Ticket;
import com.triageai.model.User;
import com.triageai.model.enums.GitProvider;
import com.triageai.model.enums.Role;
import com.triageai.model.enums.Status;
import com.triageai.repository.GitConnectionRepository;
import com.triageai.repository.TicketRepository;
import com.triageai.service.GitIntegrationService;
import com.triageai.service.GitProviderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/git")
@RequiredArgsConstructor
@Tag(name = "Git Integration", description = "Integracao com GitHub, GitLab e Bitbucket. Auto-fix, PR management, code review.")
public class GitController {

    private final GitIntegrationService gitIntegrationService;
    private final GitProviderService gitProviderService;
    private final GitConnectionRepository gitConnectionRepository;
    private final TicketRepository ticketRepository;

    @PostMapping("/auto-fix/{ticketId}")
    @Operation(summary = "Executar auto-fix", description = "IA analisa o ticket, busca no repositorio, cria branch, gera correcao de codigo e abre Pull Request automaticamente.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Auto-fix executado com sucesso. Retorna URL do PR, branch e resumo."),
            @ApiResponse(responseCode = "400", description = "Ticket nao encontrado ou repositorio nao configurado")
    })
    public ResponseEntity<AutoFixResponse> autoFix(
            @PathVariable Long ticketId,
            @RequestParam Long repoConfigId,
            @RequestParam(defaultValue = "fix") String branchType,
            @RequestParam(required = false) String branchName) {
        AutoFixResponse result = gitIntegrationService.processAutoFix(ticketId, repoConfigId, branchType, branchName);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/auto-fix/{ticketId}")
    @Operation(summary = "Desfazer auto-fix", description = "Fecha o PR no provedor Git, deleta a branch criada e reseta o ticket para status ABERTO.")
    public ResponseEntity<?> deleteAutoFix(@PathVariable Long ticketId) {
        log.info("Deleting auto-fix for ticket #{}", ticketId);

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        if (ticket.getRepoConfig() != null && (ticket.getPrUrl() != null || ticket.getPrBranch() != null)) {
            gitProviderService.closePrAndDeleteBranch(
                    ticket.getRepoConfig(), ticket.getPrUrl(), ticket.getPrBranch());
        }

        // Clear PR data from ticket
        ticket.setPrUrl(null);
        ticket.setPrBranch(null);
        ticket.setPrStatus(null);
        ticket.setPrSummary(null);
        ticket.setStatus(Status.ABERTO);
        ticketRepository.save(ticket);

        return ResponseEntity.ok(Map.of("message", "PR fechado, branch deletada e ticket resetado"));
    }

    @PostMapping("/review/{ticketId}")
    @Operation(summary = "Review do PR", description = "Envia review (APPROVE ou REQUEST_CHANGES) para o PR do ticket. Atualiza status do ticket para CODE_REVIEW se aprovado.")
    public ResponseEntity<?> reviewPr(@PathVariable Long ticketId, @RequestBody Map<String, String> body) {
        log.info("PR review for ticket #{}: {}", ticketId, body.get("action"));

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        if (ticket.getPrUrl() == null || ticket.getRepoConfig() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ticket nao tem PR"));
        }

        String action = body.getOrDefault("action", "APPROVE");
        String comment = body.getOrDefault("comment", "");

        try {
            gitProviderService.submitPrReview(ticket.getRepoConfig(), ticket.getPrUrl(), action, comment);

            if ("APPROVE".equals(action)) {
                ticket.setPrStatus("APPROVED");
                ticket.setStatus(Status.CODE_REVIEW);
                ticketRepository.save(ticket);
            }

            return ResponseEntity.ok(Map.of("message", "Review enviado com sucesso"));
        } catch (Exception e) {
            String errorMsg = e.getMessage();
            // GitHub doesn't allow PR owner to approve their own PR
            if (errorMsg != null && (errorMsg.contains("422") || errorMsg.contains("can not approve"))) {
                // Still mark as approved locally since we own the PR
                if ("APPROVE".equals(action)) {
                    ticket.setPrStatus("APPROVED");
                    ticket.setStatus(Status.CODE_REVIEW);
                    ticketRepository.save(ticket);
                }
                return ResponseEntity.ok(Map.of("message", "PR aprovado internamente (GitHub nao permite aprovar PR proprio)"));
            }
            log.error("Review failed: {}", errorMsg);
            return ResponseEntity.badRequest().body(Map.of("error", errorMsg != null ? errorMsg : "Erro desconhecido"));
        }
    }

    @GetMapping("/collaborators/{repoConfigId}")
    @Operation(summary = "Listar colaboradores", description = "Lista colaboradores do repositorio para selecao de reviewer. Retorna username e avatar de cada colaborador.")
    public ResponseEntity<?> listCollaborators(@PathVariable Long repoConfigId) {
        var config = gitIntegrationService.getRepoConfig(repoConfigId);
        return ResponseEntity.ok(gitProviderService.listCollaborators(config));
    }

    @PostMapping("/request-reviewer/{ticketId}")
    @Operation(summary = "Solicitar reviewer", description = "Solicita review de um colaborador especifico para o PR do ticket. O reviewer recebe notificacao no provedor Git.")
    public ResponseEntity<?> requestReviewer(@PathVariable Long ticketId, @RequestBody Map<String, String> body) {
        String reviewer = body.get("reviewer");
        if (reviewer == null || reviewer.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Reviewer obrigatorio"));
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        if (ticket.getPrUrl() == null || ticket.getRepoConfig() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ticket nao tem PR"));
        }

        gitProviderService.requestReviewer(ticket.getRepoConfig(), ticket.getPrUrl(), reviewer);
        return ResponseEntity.ok(Map.of("message", "Review solicitado para " + reviewer));
    }

    @GetMapping("/repos")
    @Operation(summary = "Listar repositorios", description = "Lista repositorios do usuario no provedor Git. Requer token de acesso valido.")
    public ResponseEntity<List<GitRepoResponse>> listUserRepos(
            @RequestParam String provider,
            @RequestParam String token) {
        GitProvider gitProvider = GitProvider.valueOf(provider.toUpperCase());
        List<GitRepoResponse> repos = gitProviderService.listUserRepos(gitProvider, token);
        return ResponseEntity.ok(repos);
    }

    // ── Connection management ──────────────────────────────────────────

    @PostMapping("/connect")
    @Operation(summary = "Conectar provedor Git", description = "Conecta conta do GitHub, GitLab ou Bitbucket. Salva token e busca informacoes do usuario (username, avatar).")
    public ResponseEntity<GitConnectionResponse> connect(
            @Valid @RequestBody GitConnectionRequest request,
            @AuthenticationPrincipal User user) {

        GitProvider provider = GitProvider.valueOf(request.getProvider().toUpperCase());
        String token = request.getApiToken();

        // Fetch user info from the Git provider
        Map<String, String> userInfo = gitProviderService.getUserInfo(provider, token);

        // Upsert: update existing or create new
        GitConnection connection = gitConnectionRepository
                .findByUserIdAndProvider(user.getId(), provider)
                .orElse(GitConnection.builder()
                        .user(user)
                        .provider(provider)
                        .build());

        connection.setApiToken(token);
        connection.setUsername(userInfo.get("username"));
        connection.setAvatarUrl(userInfo.get("avatarUrl"));

        // Set tenant ownership
        if (user.getEmpresa() != null) {
            connection.setEmpresa(user.getEmpresa());
        } else {
            connection.setOwnerUser(user);
        }

        gitConnectionRepository.save(connection);

        return ResponseEntity.ok(GitConnectionResponse.from(connection));
    }

    @GetMapping("/connections")
    @Operation(summary = "Listar conexoes Git", description = "Lista todas as conexoes Git do usuario autenticado (GitHub, GitLab, Bitbucket).")
    public ResponseEntity<List<GitConnectionResponse>> listConnections(
            @AuthenticationPrincipal User user) {

        List<GitConnection> connections;
        if (user.getRole() == Role.ADMIN) {
            connections = gitConnectionRepository.findAll();
        } else if (user.getEmpresa() != null) {
            connections = gitConnectionRepository.findByEmpresaId(user.getEmpresa().getId());
        } else {
            connections = gitConnectionRepository.findByOwnerUserId(user.getId());
        }

        return ResponseEntity.ok(connections.stream().map(GitConnectionResponse::from).toList());
    }

    @DeleteMapping("/connections/{id}")
    @Operation(summary = "Remover conexao Git", description = "Remove uma conexao Git do usuario. Nao afeta repositorios ja configurados.")
    public ResponseEntity<Void> deleteConnection(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        gitConnectionRepository.findById(id)
                .filter(gc -> gc.getUser().getId().equals(user.getId()))
                .ifPresent(gitConnectionRepository::delete);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/repos/{connectionId}")
    @Operation(summary = "Listar repos por conexao", description = "Lista repositorios disponiveis em uma conexao Git especifica do usuario.")
    public ResponseEntity<List<GitRepoResponse>> listReposByConnection(
            @PathVariable Long connectionId,
            @AuthenticationPrincipal User user) {

        GitConnection connection = gitConnectionRepository.findById(connectionId)
                .filter(gc -> gc.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Connection not found"));

        List<GitRepoResponse> repos = gitProviderService.listUserRepos(
                connection.getProvider(), connection.getApiToken());

        return ResponseEntity.ok(repos);
    }
}
