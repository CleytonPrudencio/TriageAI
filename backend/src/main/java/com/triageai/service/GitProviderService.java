package com.triageai.service;

import com.triageai.dto.GitRepoResponse;
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

    /**
     * Fetches the authenticated user's info (username and avatar) from the Git provider.
     */
    @SuppressWarnings("unchecked")
    public Map<String, String> getUserInfo(GitProvider provider, String token) {
        RestClient client = switch (provider) {
            case GITHUB -> RestClient.builder()
                    .baseUrl("https://api.github.com")
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Accept", "application/vnd.github+json")
                    .build();
            case GITLAB -> RestClient.builder()
                    .baseUrl("https://gitlab.com/api/v4")
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Accept", "application/json")
                    .build();
            case BITBUCKET -> RestClient.builder()
                    .baseUrl("https://api.bitbucket.org/2.0")
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Accept", "application/json")
                    .build();
        };

        return switch (provider) {
            case GITHUB -> {
                Map<String, Object> user = client.get()
                        .uri("/user")
                        .retrieve().body(Map.class);
                yield Map.of(
                        "username", (String) user.get("login"),
                        "avatarUrl", (String) user.get("avatar_url")
                );
            }
            case GITLAB -> {
                Map<String, Object> user = client.get()
                        .uri("/user")
                        .retrieve().body(Map.class);
                yield Map.of(
                        "username", (String) user.get("username"),
                        "avatarUrl", (String) user.get("avatar_url")
                );
            }
            case BITBUCKET -> {
                Map<String, Object> user = client.get()
                        .uri("/user")
                        .retrieve().body(Map.class);
                String username = (String) user.get("username");
                String avatarUrl = "";
                Map<String, Object> links = (Map<String, Object>) user.get("links");
                if (links != null) {
                    Map<String, Object> avatar = (Map<String, Object>) links.get("avatar");
                    if (avatar != null) {
                        avatarUrl = (String) avatar.get("href");
                    }
                }
                yield Map.of(
                        "username", username != null ? username : "",
                        "avatarUrl", avatarUrl
                );
            }
        };
    }

    public String getDefaultBranchSha(RepoConfig config) {
        return getBranchSha(config, config.getDefaultBranch());
    }

    public String getBranchSha(RepoConfig config, String branchName) {
        RestClient client = buildClient(config);

        return switch (config.getProvider()) {
            case GITHUB -> {
                Map<?, ?> ref = client.get()
                        .uri("/repos/{owner}/{repo}/git/ref/heads/{branch}",
                                config.getRepoOwner(), config.getRepoName(), branchName)
                        .retrieve().body(Map.class);
                yield ((Map<?, ?>) ref.get("object")).get("sha").toString();
            }
            case GITLAB -> {
                String projectId = config.getRepoOwner() + "/" + config.getRepoName();
                Map<?, ?> branch = client.get()
                        .uri("/projects/{id}/repository/branches/{branch}",
                                projectId.replace("/", "%2F"), branchName)
                        .retrieve().body(Map.class);
                yield ((Map<?, ?>) branch.get("commit")).get("id").toString();
            }
            case BITBUCKET -> {
                Map<?, ?> ref = client.get()
                        .uri("/repositories/{owner}/{repo}/refs/branches/{branch}",
                                config.getRepoOwner(), config.getRepoName(), branchName)
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
     * Returns PR status: "open", "approved", "closed", or "merged"
     */
    @SuppressWarnings("unchecked")
    public String getPrStatus(RepoConfig config, String prUrl) {
        RestClient client = buildClient(config);

        try {
            return switch (config.getProvider()) {
                case GITHUB -> {
                    String prNumber = prUrl.replaceAll(".*/pull/(\\d+).*", "$1");
                    Map<?, ?> pr = client.get()
                            .uri("/repos/{owner}/{repo}/pulls/{number}",
                                    config.getRepoOwner(), config.getRepoName(), prNumber)
                            .retrieve().body(Map.class);
                    boolean merged = Boolean.TRUE.equals(pr.get("merged"));
                    String state = pr.get("state").toString();

                    if (merged) yield "merged";
                    if ("closed".equals(state)) yield "closed";

                    // Check if PR has approved reviews
                    try {
                        List<Map<String, Object>> reviews = client.get()
                                .uri("/repos/{owner}/{repo}/pulls/{number}/reviews",
                                        config.getRepoOwner(), config.getRepoName(), prNumber)
                                .retrieve().body(List.class);
                        if (reviews != null) {
                            boolean approved = reviews.stream()
                                    .anyMatch(r -> "APPROVED".equals(r.get("state")));
                            if (approved) yield "approved";
                        }
                    } catch (Exception e) {
                        log.debug("Could not fetch reviews for PR #{}: {}", prNumber, e.getMessage());
                    }

                    yield "open";
                }
                case GITLAB -> {
                    yield "open"; // TODO: implement
                }
                case BITBUCKET -> {
                    yield "open"; // TODO: implement
                }
            };
        } catch (Exception e) {
            log.warn("Failed to check PR status: {}", e.getMessage());
            return "unknown";
        }
    }

    /**
     * Lista repos do usuario com acesso de escrita (push).
     */
    @SuppressWarnings("unchecked")
    public List<GitRepoResponse> listUserRepos(GitProvider provider, String token) {
        RestClient client = switch (provider) {
            case GITHUB -> RestClient.builder()
                    .baseUrl("https://api.github.com")
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Accept", "application/vnd.github+json")
                    .build();
            case GITLAB -> RestClient.builder()
                    .baseUrl("https://gitlab.com/api/v4")
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Accept", "application/json")
                    .build();
            case BITBUCKET -> RestClient.builder()
                    .baseUrl("https://api.bitbucket.org/2.0")
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Accept", "application/json")
                    .build();
        };

        List<GitRepoResponse> repos = new ArrayList<>();

        switch (provider) {
            case GITHUB -> {
                List<Map<String, Object>> items = client.get()
                        .uri("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member")
                        .retrieve().body(List.class);
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        Map<String, Object> perms = (Map<String, Object>) item.get("permissions");
                        if (perms != null && Boolean.TRUE.equals(perms.get("push"))) {
                            Map<String, Object> owner = (Map<String, Object>) item.get("owner");
                            repos.add(new GitRepoResponse(
                                    (String) item.get("full_name"),
                                    owner != null ? (String) owner.get("login") : "",
                                    (String) item.get("name"),
                                    (String) item.get("default_branch"),
                                    Boolean.TRUE.equals(item.get("private")),
                                    (String) item.get("language"),
                                    (String) item.get("updated_at")
                            ));
                        }
                    }
                }
            }
            case GITLAB -> {
                List<Map<String, Object>> items = client.get()
                        .uri("/projects?membership=true&min_access_level=30&per_page=100&order_by=updated_at")
                        .retrieve().body(List.class);
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        Map<String, Object> ns = (Map<String, Object>) item.get("namespace");
                        repos.add(new GitRepoResponse(
                                (String) item.get("path_with_namespace"),
                                ns != null ? (String) ns.get("path") : "",
                                (String) item.get("path"),
                                (String) item.get("default_branch"),
                                "private".equals(item.get("visibility")),
                                null,
                                (String) item.get("last_activity_at")
                        ));
                    }
                }
            }
            case BITBUCKET -> {
                Map<String, Object> response = client.get()
                        .uri("/user/permissions/repositories?pagelen=100")
                        .retrieve().body(Map.class);
                if (response != null) {
                    List<Map<String, Object>> values = (List<Map<String, Object>>) response.get("values");
                    if (values != null) {
                        for (Map<String, Object> item : values) {
                            String perm = (String) item.get("permission");
                            if ("write".equals(perm) || "admin".equals(perm)) {
                                Map<String, Object> repo = (Map<String, Object>) item.get("repository");
                                if (repo != null) {
                                    repos.add(new GitRepoResponse(
                                            (String) repo.get("full_name"),
                                            (String) ((Map<String, Object>) repo.get("owner")).get("username"),
                                            (String) repo.get("slug"),
                                            "main",
                                            Boolean.TRUE.equals(repo.get("is_private")),
                                            (String) repo.get("language"),
                                            (String) repo.get("updated_on")
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }

        log.info("Found {} repos with push access for provider {}", repos.size(), provider);
        return repos;
    }

    public void closePrAndDeleteBranch(RepoConfig config, String prUrl, String branchName) {
        RestClient client = buildClient(config);

        switch (config.getProvider()) {
            case GITHUB -> {
                // 1. Close the PR
                if (prUrl != null) {
                    String prNumber = prUrl.replaceAll(".*/pull/(\\d+).*", "$1");
                    try {
                        client.patch()
                            .uri("/repos/{owner}/{repo}/pulls/{number}",
                                    config.getRepoOwner(), config.getRepoName(), prNumber)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(Map.of("state", "closed"))
                            .retrieve().toBodilessEntity();
                        log.info("Closed PR #{} on {}/{}", prNumber, config.getRepoOwner(), config.getRepoName());
                    } catch (Exception e) {
                        log.warn("Failed to close PR: {}", e.getMessage());
                    }
                }

                // 2. Delete the branch
                if (branchName != null) {
                    try {
                        client.delete()
                            .uri("/repos/{owner}/{repo}/git/refs/heads/{branch}",
                                    config.getRepoOwner(), config.getRepoName(), branchName)
                            .retrieve().toBodilessEntity();
                        log.info("Deleted branch '{}' on {}/{}", branchName, config.getRepoOwner(), config.getRepoName());
                    } catch (Exception e) {
                        log.warn("Failed to delete branch: {}", e.getMessage());
                    }
                }
            }
            case GITLAB -> { /* TODO */ }
            case BITBUCKET -> { /* TODO */ }
        }
    }

    public void submitPrReview(RepoConfig config, String prUrl, String action, String comment) {
        RestClient client = buildClient(config);

        switch (config.getProvider()) {
            case GITHUB -> {
                String prNumber = prUrl.replaceAll(".*/pull/(\\d+).*", "$1");
                // GitHub review event: APPROVE, REQUEST_CHANGES, COMMENT
                String event = "APPROVE".equals(action) ? "APPROVE" : "REQUEST_CHANGES";
                client.post()
                        .uri("/repos/{owner}/{repo}/pulls/{number}/reviews",
                                config.getRepoOwner(), config.getRepoName(), prNumber)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("event", event, "body", comment != null ? comment : ""))
                        .retrieve().toBodilessEntity();
                log.info("Submitted {} review for PR #{} on {}/{}", event, prNumber,
                        config.getRepoOwner(), config.getRepoName());
            }
            case GITLAB -> { /* TODO */ }
            case BITBUCKET -> { /* TODO */ }
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
