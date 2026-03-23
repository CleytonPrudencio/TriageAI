package com.triageai.controller;

import com.triageai.model.Sistema;
import com.triageai.model.RepoConfig;
import com.triageai.repository.SistemaRepository;
import com.triageai.repository.RepoConfigRepository;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sistemas")
@RequiredArgsConstructor
public class SistemaController {

    private final SistemaRepository sistemaRepository;
    private final RepoConfigRepository repoConfigRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> findAll() {
        return ResponseEntity.ok(sistemaRepository.findAllByOrderByNomeAsc().stream()
                .map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        return sistemaRepository.findById(id)
                .map(s -> ResponseEntity.ok(toResponse(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SistemaRequest req) {
        Sistema s = new Sistema();
        applyRequest(s, req);
        if (req.getRepoConfigId() != null) {
            repoConfigRepository.findById(req.getRepoConfigId()).ifPresent(s::setRepoConfig);
        }
        return ResponseEntity.ok(toResponse(sistemaRepository.save(s)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody SistemaRequest req) {
        return sistemaRepository.findById(id).map(s -> {
            applyRequest(s, req);
            if (req.getRepoConfigId() != null) {
                repoConfigRepository.findById(req.getRepoConfigId()).ifPresent(s::setRepoConfig);
            } else {
                s.setRepoConfig(null);
            }
            return ResponseEntity.ok(toResponse(sistemaRepository.save(s)));
        }).orElse(ResponseEntity.notFound().build());
    }

    private void applyRequest(Sistema s, SistemaRequest req) {
        s.setNome(req.getNome());
        s.setDescricao(req.getDescricao());
        s.setAutoFixEnabled(req.isAutoFixEnabled());
        s.setBranchHotfix(req.getBranchHotfix() != null ? req.getBranchHotfix() : "main");
        s.setBranchBugfix(req.getBranchBugfix() != null ? req.getBranchBugfix() : "develop");
        s.setBranchFix(req.getBranchFix() != null ? req.getBranchFix() : "develop");
        s.setBranchFeat(req.getBranchFeat() != null ? req.getBranchFeat() : "develop");
        s.setBranchRefactor(req.getBranchRefactor() != null ? req.getBranchRefactor() : "develop");
        s.setBranchDocs(req.getBranchDocs() != null ? req.getBranchDocs() : "develop");
        s.setBranchChore(req.getBranchChore() != null ? req.getBranchChore() : "develop");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        sistemaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Sistema removido"));
    }

    private Map<String, Object> toResponse(Sistema s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("nome", s.getNome());
        map.put("descricao", s.getDescricao());
        map.put("autoFixEnabled", s.isAutoFixEnabled());
        // Branch mapping
        Map<String, String> branches = new LinkedHashMap<>();
        branches.put("hotfix", s.getBranchHotfix() != null ? s.getBranchHotfix() : "main");
        branches.put("bugfix", s.getBranchBugfix() != null ? s.getBranchBugfix() : "develop");
        branches.put("fix", s.getBranchFix() != null ? s.getBranchFix() : "develop");
        branches.put("feat", s.getBranchFeat() != null ? s.getBranchFeat() : "develop");
        branches.put("refactor", s.getBranchRefactor() != null ? s.getBranchRefactor() : "develop");
        branches.put("docs", s.getBranchDocs() != null ? s.getBranchDocs() : "develop");
        branches.put("chore", s.getBranchChore() != null ? s.getBranchChore() : "develop");
        map.put("branchMapping", branches);
        map.put("createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        if (s.getRepoConfig() != null) {
            map.put("repoConfigId", s.getRepoConfig().getId());
            map.put("repoName", s.getRepoConfig().getRepoName());
            map.put("repoOwner", s.getRepoConfig().getRepoOwner());
            map.put("provider", s.getRepoConfig().getProvider().name());
            map.put("repoFullName", s.getRepoConfig().getRepoOwner() + "/" + s.getRepoConfig().getRepoName());
        }
        return map;
    }

    @Data
    public static class SistemaRequest {
        private String nome;
        private String descricao;
        private Long repoConfigId;
        private boolean autoFixEnabled;
        private String branchHotfix;
        private String branchBugfix;
        private String branchFix;
        private String branchFeat;
        private String branchRefactor;
        private String branchDocs;
        private String branchChore;
    }
}
