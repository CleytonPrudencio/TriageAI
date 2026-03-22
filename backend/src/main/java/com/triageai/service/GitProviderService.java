package com.triageai.service;

import com.triageai.model.RepoConfig;
import com.triageai.model.enums.GitProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
@Slf4j
public class GitProviderService {

    private RestClient buildClient(RepoConfig config) {
        String baseUrl = switch (config.getProvider()) {
            case GITHUB -> "https://api.github.com";
            case GITLAB -> "https://gitlab.com/api/v4";
            case BITBUCKET -> "https://api.bitbucket.org/2.0";
        };

        String authHeader = switch (config.getProvider()) {
            case GITHUB -> "Bearer " + config.getApiToken();
            case GITLAB -> "Bearer " + config.getApiToken();
            case BITBUCKET -> "Bearer " + config.getApiToken();
        };

        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", authHeader)
                .defaultHeader("Accept", "application/json")
                .build();
    }

    public String getDefaultBranchSha(RepoConfig config) {
        RestClient client = buildClient(config);

        return switch (config.getProvider()) {
            case GITHUB -> {
                Map<?, ?> ref = client.get()
                        .uri("/repos/{owner}/{repo}/git/ref/heads/{branch}",
                                config.getRepoOwner(), config.getRepoName(), config.getDefaultBranch())
                        .retrieve().body(Map.class);
                yield ((Map<?, ?>) ref.get("object")).get("sha").toString();
            }
            case GITLAB -> {
                String projectId = config.getRepoOwner() + "/" + config.getRepoName();
                Map<?, ?> branch = client.get()
                        .uri("/projects/{id}/repository/branches/{branch}",
                                projectId.replace("/", "%2F"), config.getDefaultBranch())
                        .retrieve().body(Map.class);
                yield ((Map<?, ?>) branch.get("commit")).get("id").toString();
            }
            case BITBUCKET -> {
                Map<?, ?> ref = client.get()
                        .uri("/repositories/{owner}/{repo}/refs/branches/{branch}",
                                config.getRepoOwner(), config.getRepoName(), config.getDefaultBranch())
                        .retrieve().body(Map.class);
                yield ((Map<?, ?>) ref.get("target")).get("hash").toString();
            }
        };
    }

    public void createBranch(RepoConfig config, String branchName, String baseSha) {
        RestClient client = buildClient(config);

        try {
        switch (config.getProvider()) {
            case GITHUB -> client.post()
                    .uri("/repos/{owner}/{repo}/git/refs", config.getRepoOwner(), config.getRepoName())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("ref", "refs/heads/" + branchName, "sha", baseSha))
                    .retrieve().toBodilessEntity();

            case GITLAB -> {
                String projectId = (config.getRepoOwner() + "/" + config.getRepoName()).replace("/", "%2F");
                client.post()
                        .uri("/projects/{id}/repository/branches?branch={branch}&ref={ref}",
                                projectId, branchName, baseSha)
                        .retrieve().toBodilessEntity();
            }

            case BITBUCKET -> client.post()
                    .uri("/repositories/{owner}/{repo}/refs/branches",
                            config.getRepoOwner(), config.getRepoName())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("name", branchName, "target", Map.of("hash", baseSha)))
                    .retrieve().toBodilessEntity();
        }
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("422")) {
                log.info("Branch '{}' already exists, reusing it", branchName);
            } else {
                throw e;
            }
        }

        log.info("Branch '{}' ready on {}/{}", branchName, config.getRepoOwner(), config.getRepoName());
    }

    public Map<String, Object> getFileContent(RepoConfig config, String filePath, String branch) {
        RestClient client = buildClient(config);

        return switch (config.getProvider()) {
            case GITHUB -> {
                Map<?, ?> file = client.get()
                        .uri("/repos/{owner}/{repo}/contents/{path}?ref={branch}",
                                config.getRepoOwner(), config.getRepoName(), filePath, branch)
                        .retrieve().body(Map.class);
                String content = new String(Base64.getMimeDecoder().decode(file.get("content").toString()));
                yield Map.of("content", content, "sha", file.get("sha").toString());
            }
            case GITLAB -> {
                String projectId = (config.getRepoOwner() + "/" + config.getRepoName()).replace("/", "%2F");
                String encodedPath = filePath.replace("/", "%2F");
                Map<?, ?> file = client.get()
                        .uri("/projects/{id}/repository/files/{path}?ref={branch}",
                                projectId, encodedPath, branch)
                        .retrieve().body(Map.class);
                String content = new String(Base64.getMimeDecoder().decode(file.get("content").toString()));
                yield Map.of("content", content, "sha", file.get("blob_id").toString());
            }
            case BITBUCKET -> {
                String content = client.get()
                        .uri("/repositories/{owner}/{repo}/src/{branch}/{path}",
                                config.getRepoOwner(), config.getRepoName(), branch, filePath)
                        .retrieve().body(String.class);
                yield Map.of("content", content, "sha", "");
            }
        };
    }

    public void updateFile(RepoConfig config, String filePath, String content,
                           String commitMessage, String branch, String existingSha) {
        RestClient client = buildClient(config);

        switch (config.getProvider()) {
            case GITHUB -> {
                Map<String, Object> body = new HashMap<>();
                body.put("message", commitMessage);
                body.put("content", Base64.getEncoder().encodeToString(content.getBytes()));
                body.put("branch", branch);
                if (existingSha != null) body.put("sha", existingSha);

                client.put()
                        .uri("/repos/{owner}/{repo}/contents/{path}",
                                config.getRepoOwner(), config.getRepoName(), filePath)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve().toBodilessEntity();
            }
            case GITLAB -> {
                String projectId = (config.getRepoOwner() + "/" + config.getRepoName()).replace("/", "%2F");
                String encodedPath = filePath.replace("/", "%2F");
                client.put()
                        .uri("/projects/{id}/repository/files/{path}", projectId, encodedPath)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "branch", branch,
                                "content", content,
                                "commit_message", commitMessage
                        ))
                        .retrieve().toBodilessEntity();
            }
            case BITBUCKET -> {
                // Bitbucket uses multipart form
                client.post()
                        .uri("/repositories/{owner}/{repo}/src",
                                config.getRepoOwner(), config.getRepoName())
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(filePath + "=" + content + "&message=" + commitMessage + "&branch=" + branch)
                        .retrieve().toBodilessEntity();
            }
        }

        log.info("File '{}' updated on branch '{}'", filePath, branch);
    }

    public String createPullRequest(RepoConfig config, String title, String body,
                                    String headBranch, String baseBranch) {
        RestClient client = buildClient(config);

        return switch (config.getProvider()) {
            case GITHUB -> {
                Map<?, ?> pr = client.post()
                        .uri("/repos/{owner}/{repo}/pulls", config.getRepoOwner(), config.getRepoName())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "title", title,
                                "body", body,
                                "head", headBranch,
                                "base", baseBranch
                        ))
                        .retrieve().body(Map.class);
                String prUrl = pr.get("html_url").toString();
                int prNumber = ((Number) pr.get("number")).intValue();

                // Request review if configured
                if (config.getReviewerUsername() != null && !config.getReviewerUsername().isBlank()) {
                    try {
                        client.post()
                                .uri("/repos/{owner}/{repo}/pulls/{number}/requested_reviewers",
                                        config.getRepoOwner(), config.getRepoName(), prNumber)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(Map.of("reviewers", List.of(config.getReviewerUsername())))
                                .retrieve().toBodilessEntity();
                    } catch (Exception e) {
                        log.warn("Could not request review: {}", e.getMessage());
                    }
                }

                yield prUrl;
            }
            case GITLAB -> {
                String projectId = (config.getRepoOwner() + "/" + config.getRepoName()).replace("/", "%2F");
                Map<String, Object> mrBody = new HashMap<>();
                mrBody.put("source_branch", headBranch);
                mrBody.put("target_branch", baseBranch);
                mrBody.put("title", title);
                mrBody.put("description", body);
                if (config.getReviewerUsername() != null && !config.getReviewerUsername().isBlank()) {
                    mrBody.put("reviewer_ids", List.of(config.getReviewerUsername()));
                }

                Map<?, ?> mr = client.post()
                        .uri("/projects/{id}/merge_requests", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(mrBody)
                        .retrieve().body(Map.class);
                yield mr.get("web_url").toString();
            }
            case BITBUCKET -> {
                Map<String, Object> prBody = new HashMap<>();
                prBody.put("title", title);
                prBody.put("description", body);
                prBody.put("source", Map.of("branch", Map.of("name", headBranch)));
                prBody.put("destination", Map.of("branch", Map.of("name", baseBranch)));
                if (config.getReviewerUsername() != null && !config.getReviewerUsername().isBlank()) {
                    prBody.put("reviewers", List.of(Map.of("username", config.getReviewerUsername())));
                }

                Map<?, ?> pr = client.post()
                        .uri("/repositories/{owner}/{repo}/pullrequests",
                                config.getRepoOwner(), config.getRepoName())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(prBody)
                        .retrieve().body(Map.class);
                yield ((Map<?, ?>) pr.get("links")).get("html").toString();
            }
        };
    }

    /**
     * Returns PR status: "open", "closed", or "merged"
     */
    public String getPrStatus(RepoConfig config, String prUrl) {
        RestClient client = buildClient(config);

        try {
            return switch (config.getProvider()) {
                case GITHUB -> {
                    // Extract PR number from URL: .../pull/123
                    String prNumber = prUrl.replaceAll(".*/pull/(\\d+).*", "$1");
                    Map<?, ?> pr = client.get()
                            .uri("/repos/{owner}/{repo}/pulls/{number}",
                                    config.getRepoOwner(), config.getRepoName(), prNumber)
                            .retrieve().body(Map.class);
                    boolean merged = Boolean.TRUE.equals(pr.get("merged"));
                    String state = pr.get("state").toString();
                    yield merged ? "merged" : state; // "open", "closed", or "merged"
                }
                case GITLAB -> {
                    yield "open"; // simplified
                }
                case BITBUCKET -> {
                    yield "open"; // simplified
                }
            };
        } catch (Exception e) {
            log.warn("Failed to check PR status: {}", e.getMessage());
            return "unknown";
        }
    }

    public List<String> listFiles(RepoConfig config, String branch, String path) {
        RestClient client = buildClient(config);

        return switch (config.getProvider()) {
            case GITHUB -> {
                List<?> items = client.get()
                        .uri("/repos/{owner}/{repo}/contents/{path}?ref={branch}",
                                config.getRepoOwner(), config.getRepoName(),
                                path != null ? path : "", branch)
                        .retrieve().body(List.class);
                List<String> files = new ArrayList<>();
                for (Object item : items) {
                    Map<?, ?> fileMap = (Map<?, ?>) item;
                    if ("file".equals(fileMap.get("type"))) {
                        files.add(fileMap.get("path").toString());
                    }
                }
                yield files;
            }
            case GITLAB, BITBUCKET -> {
                // Simplified: return empty for now, GitHub is the primary target
                yield List.of();
            }
        };
    }
}
