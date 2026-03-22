package com.triageai.controller;

import com.triageai.dto.AutoFixResponse;
import com.triageai.service.GitIntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/git")
@RequiredArgsConstructor
public class GitController {

    private final GitIntegrationService gitIntegrationService;

    @PostMapping("/auto-fix/{ticketId}")
    public ResponseEntity<AutoFixResponse> autoFix(
            @PathVariable Long ticketId,
            @RequestParam Long repoConfigId) {
        AutoFixResponse result = gitIntegrationService.processAutoFix(ticketId, repoConfigId);
        return ResponseEntity.ok(result);
    }
}
