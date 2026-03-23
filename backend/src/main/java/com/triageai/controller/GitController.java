package com.triageai.controller;

import com.triageai.dto.AutoFixResponse;
import com.triageai.dto.GitRepoResponse;
import com.triageai.model.enums.GitProvider;
import com.triageai.service.GitIntegrationService;
import com.triageai.service.GitProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/git")
@RequiredArgsConstructor
public class GitController {

    private final GitIntegrationService gitIntegrationService;
    private final GitProviderService gitProviderService;

    @PostMapping("/auto-fix/{ticketId}")
    public ResponseEntity<AutoFixResponse> autoFix(
            @PathVariable Long ticketId,
            @RequestParam Long repoConfigId) {
        AutoFixResponse result = gitIntegrationService.processAutoFix(ticketId, repoConfigId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/repos")
    public ResponseEntity<List<GitRepoResponse>> listUserRepos(
            @RequestParam String provider,
            @RequestParam String token) {
        GitProvider gitProvider = GitProvider.valueOf(provider.toUpperCase());
        List<GitRepoResponse> repos = gitProviderService.listUserRepos(gitProvider, token);
        return ResponseEntity.ok(repos);
    }
}
