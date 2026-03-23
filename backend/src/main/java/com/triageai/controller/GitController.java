package com.triageai.controller;

import com.triageai.dto.AutoFixResponse;
import com.triageai.dto.GitConnectionRequest;
import com.triageai.dto.GitConnectionResponse;
import com.triageai.dto.GitRepoResponse;
import com.triageai.model.GitConnection;
import com.triageai.model.Ticket;
import com.triageai.model.User;
import com.triageai.model.enums.GitProvider;
import com.triageai.model.enums.Status;
import com.triageai.repository.GitConnectionRepository;
import com.triageai.repository.TicketRepository;
import com.triageai.service.GitIntegrationService;
import com.triageai.service.GitProviderService;
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
public class GitController {

    private final GitIntegrationService gitIntegrationService;
    private final GitProviderService gitProviderService;
    private final GitConnectionRepository gitConnectionRepository;
    private final TicketRepository ticketRepository;

    @PostMapping("/auto-fix/{ticketId}")
    public ResponseEntity<AutoFixResponse> autoFix(
            @PathVariable Long ticketId,
            @RequestParam Long repoConfigId,
            @RequestParam(defaultValue = "fix") String branchType,
            @RequestParam(required = false) String branchName) {
        AutoFixResponse result = gitIntegrationService.processAutoFix(ticketId, repoConfigId, branchType, branchName);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/auto-fix/{ticketId}")
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
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/repos")
    public ResponseEntity<List<GitRepoResponse>> listUserRepos(
            @RequestParam String provider,
            @RequestParam String token) {
        GitProvider gitProvider = GitProvider.valueOf(provider.toUpperCase());
        List<GitRepoResponse> repos = gitProviderService.listUserRepos(gitProvider, token);
        return ResponseEntity.ok(repos);
    }

    // ── Connection management ──────────────────────────────────────────

    @PostMapping("/connect")
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

        gitConnectionRepository.save(connection);

        return ResponseEntity.ok(GitConnectionResponse.from(connection));
    }

    @GetMapping("/connections")
    public ResponseEntity<List<GitConnectionResponse>> listConnections(
            @AuthenticationPrincipal User user) {

        List<GitConnectionResponse> connections = gitConnectionRepository
                .findByUserId(user.getId())
                .stream()
                .map(GitConnectionResponse::from)
                .toList();

        return ResponseEntity.ok(connections);
    }

    @DeleteMapping("/connections/{id}")
    public ResponseEntity<Void> deleteConnection(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        gitConnectionRepository.findById(id)
                .filter(gc -> gc.getUser().getId().equals(user.getId()))
                .ifPresent(gitConnectionRepository::delete);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/repos/{connectionId}")
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
