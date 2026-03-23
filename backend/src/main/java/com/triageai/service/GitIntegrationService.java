package com.triageai.service;

import com.triageai.dto.AutoFixResponse;
import com.triageai.dto.CodeAnalysisResponse;
import com.triageai.model.RepoConfig;
import com.triageai.model.Ticket;
import com.triageai.repository.RepoConfigRepository;
import com.triageai.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class GitIntegrationService {

    private final GitProviderService gitProvider;
    private final TicketRepository ticketRepository;
    private final RepoConfigRepository repoConfigRepository;
    private final AiService aiService;

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    public AutoFixResponse processAutoFix(Long ticketId, Long repoConfigId) {
        return processAutoFix(ticketId, repoConfigId, "fix", null);
    }

    public AutoFixResponse processAutoFix(Long ticketId, Long repoConfigId, String branchType, String branchNameCustom) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket nao encontrado"));

        RepoConfig config = repoConfigRepository.findById(repoConfigId)
                .orElseThrow(() -> new RuntimeException("Configuracao de repositorio nao encontrada"));

        // If branchType is "auto" or empty, predict it using AI
        if (branchType == null || branchType.isBlank() || "auto".equalsIgnoreCase(branchType)) {
            String fullText = ticket.getTitulo() + " " + ticket.getDescricao();
            String categoria = ticket.getCategoria() != null ? ticket.getCategoria().name() : "";
            branchType = aiService.predictBranchType(fullText, categoria);
            log.info("AI predicted branch type '{}' for ticket #{}", branchType, ticket.getId());
        }

        // Build branch name: type/name
        String namePart = (branchNameCustom != null && !branchNameCustom.isBlank())
                ? branchNameCustom.replaceAll("[^a-zA-Z0-9_-]", "-")
                : "ticket-" + ticket.getId();
        String branchName = branchType + "/" + namePart;

        try {
            // 1. Get base branch SHA
            log.info("Getting base SHA for {}/{}", config.getRepoOwner(), config.getRepoName());
            String baseSha = gitProvider.getDefaultBranchSha(config);

            // 2. Create fix branch
            log.info("Creating branch '{}'", branchName);
            gitProvider.createBranch(config, branchName, baseSha);

            // 3. Analyze code with AI
            log.info("Analyzing code for ticket #{}", ticket.getId());
            CodeAnalysisResponse analysis = analyzeCode(ticket, config);

            if (analysis == null || analysis.getFixes() == null || analysis.getFixes().isEmpty()) {
                ticket.setPrStatus("ANALYSIS_FAILED");
                ticketRepository.save(ticket);
                return new AutoFixResponse("error", branchName, null,
                        "IA nao encontrou correcoes para aplicar", 0);
            }

            // 4. Apply fixes: commit each file (supports creating new files)
            int filesChanged = 0;
            for (CodeAnalysisResponse.FileFix fix : analysis.getFixes()) {
                try {
                    String existingSha = null;
                    boolean isNewFile = (fix.getOriginalCode() == null || fix.getOriginalCode().isBlank());

                    if (!isNewFile) {
                        // Get existing file SHA (needed for GitHub updates)
                        try {
                            Map<String, Object> existingFile = gitProvider.getFileContent(
                                    config, fix.getFilePath(), branchName);
                            existingSha = existingFile.get("sha").toString();
                        } catch (Exception e) {
                            // File might not exist on fix branch yet, try default branch
                            try {
                                Map<String, Object> existingFile = gitProvider.getFileContent(
                                        config, fix.getFilePath(), config.getDefaultBranch());
                                existingSha = existingFile.get("sha").toString();
                            } catch (Exception e2) {
                                // File doesn't exist anywhere - treat as new file
                                isNewFile = true;
                            }
                        }
                    }

                    String action = isNewFile ? "Create" : "Fix";
                    String commitMsg = String.format("[TriageAI #%d] %s: %s\n\n%s",
                            ticket.getId(), action, fix.getFilePath(), fix.getExplanation());

                    gitProvider.updateFile(config, fix.getFilePath(), fix.getFixedCode(),
                            commitMsg, branchName, existingSha);
                    filesChanged++;
                    log.info("{} file '{}' on branch '{}'", action, fix.getFilePath(), branchName);
                } catch (Exception e) {
                    log.warn("Failed to process file '{}': {}", fix.getFilePath(), e.getMessage());
                }
            }

            if (filesChanged == 0) {
                ticket.setPrStatus("COMMIT_FAILED");
                ticketRepository.save(ticket);
                return new AutoFixResponse("error", branchName, null,
                        "Nao foi possivel commitar as correcoes", 0);
            }

            // 5. Create Pull Request
            String prTitle = String.format("[TriageAI #%d] %s", ticket.getId(), ticket.getTitulo());
            String prBody = buildPrBody(ticket, analysis);

            log.info("Creating PR for ticket #{}", ticket.getId());
            String prUrl = gitProvider.createPullRequest(config, prTitle, prBody,
                    branchName, config.getDefaultBranch());

            // 6. Build PR summary
            String prSummary = buildPrSummary(ticket, analysis, branchName, prUrl, filesChanged);

            // 7. Update ticket with PR info and change status
            ticket.setPrBranch(branchName);
            ticket.setPrUrl(prUrl);
            ticket.setPrStatus("OPEN");
            ticket.setPrSummary(prSummary);
            ticket.setStatus(com.triageai.model.enums.Status.CODE_REVIEW);
            ticket.setRepoConfig(config);
            ticketRepository.save(ticket);

            log.info("Auto-fix complete for ticket #{}: {}", ticket.getId(), prUrl);

            return new AutoFixResponse("success", branchName, prUrl,
                    "PR criado com sucesso! " + filesChanged + " arquivo(s) corrigido(s).", filesChanged);

        } catch (Exception e) {
            log.error("Auto-fix failed for ticket #{}: {}", ticket.getId(), e.getMessage(), e);
            ticket.setPrBranch(branchName);
            ticket.setPrStatus("FAILED");
            ticketRepository.save(ticket);
            return new AutoFixResponse("error", branchName, null,
                    "Erro: " + e.getMessage(), 0);
        }
    }

    private CodeAnalysisResponse analyzeCode(Ticket ticket, RepoConfig config) {
        try {
            RestClient client = RestClient.builder().baseUrl(aiServiceUrl).build();

            return client.post()
                    .uri("/analyze-code")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "ticket_title", ticket.getTitulo(),
                            "ticket_description", ticket.getDescricao(),
                            "categoria", ticket.getCategoria() != null ? ticket.getCategoria().name() : "",
                            "repo_owner", config.getRepoOwner(),
                            "repo_name", config.getRepoName(),
                            "provider", config.getProvider().name().toLowerCase(),
                            "api_token", config.getApiToken(),
                            "default_branch", config.getDefaultBranch()
                    ))
                    .retrieve()
                    .body(CodeAnalysisResponse.class);
        } catch (Exception e) {
            log.error("AI code analysis failed: {}", e.getMessage());
            return null;
        }
    }

    private String buildPrSummary(Ticket ticket, CodeAnalysisResponse analysis,
                                    String branchName, String prUrl, int filesChanged) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"branch\": \"").append(branchName).append("\",");
        sb.append("\"prUrl\": \"").append(prUrl).append("\",");
        sb.append("\"filesChanged\": ").append(filesChanged).append(",");
        sb.append("\"createdAt\": \"").append(java.time.LocalDateTime.now()).append("\",");
        sb.append("\"repo\": \"").append(ticket.getRepoConfig() != null ?
                ticket.getRepoConfig().getRepoOwner() + "/" + ticket.getRepoConfig().getRepoName() : "").append("\",");
        sb.append("\"fixes\": [");

        boolean first = true;
        for (CodeAnalysisResponse.FileFix fix : analysis.getFixes()) {
            if (!first) sb.append(",");
            sb.append("{");
            sb.append("\"file\": \"").append(fix.getFilePath().replace("\"", "\\\"")).append("\",");
            sb.append("\"explanation\": \"").append(fix.getExplanation().replace("\"", "\\\"")).append("\"");
            sb.append("}");
            first = false;
        }

        sb.append("]}");
        return sb.toString();
    }

    private String buildPrBody(Ticket ticket, CodeAnalysisResponse analysis) {
        StringBuilder sb = new StringBuilder();
        sb.append("## Correcao Automatica - TriageAI\n\n");
        sb.append("**Ticket:** #").append(ticket.getId()).append("\n");
        sb.append("**Titulo:** ").append(ticket.getTitulo()).append("\n");
        sb.append("**Categoria:** ").append(ticket.getCategoria()).append("\n");
        sb.append("**Prioridade:** ").append(ticket.getPrioridade()).append("\n\n");
        sb.append("### Descricao do Problema\n");
        sb.append(ticket.getDescricao()).append("\n\n");
        sb.append("### Correcoes Aplicadas\n\n");

        for (CodeAnalysisResponse.FileFix fix : analysis.getFixes()) {
            sb.append("- **").append(fix.getFilePath()).append("**: ").append(fix.getExplanation()).append("\n");
        }

        sb.append("\n---\n");
        sb.append("*PR gerado automaticamente pelo TriageAI*");
        return sb.toString();
    }
}
