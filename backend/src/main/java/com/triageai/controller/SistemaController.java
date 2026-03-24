package com.triageai.controller;

import com.triageai.model.Sistema;
import com.triageai.model.RepoConfig;
import com.triageai.model.User;
import com.triageai.model.enums.Role;
import com.triageai.repository.SistemaRepository;
import com.triageai.repository.RepoConfigRepository;
import com.triageai.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sistemas")
@RequiredArgsConstructor
@Tag(name = "Sistemas", description = "Gerenciamento de sistemas/ambientes vinculados a repositorios Git")
public class SistemaController {

    private final SistemaRepository sistemaRepository;
    private final RepoConfigRepository repoConfigRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Listar sistemas", description = "Lista todos os sistemas cadastrados ordenados por nome. Inclui configuracoes de branch, reviewers e repositorio vinculado.")
    public ResponseEntity<List<Map<String, Object>>> findAll() {
        User user = getAuthenticatedUser();
        List<Sistema> sistemas;
        if (user != null && user.getRole() == Role.ADMIN) {
            sistemas = sistemaRepository.findAllByOrderByNomeAsc();
        } else if (user != null && user.getEmpresa() != null) {
            sistemas = sistemaRepository.findByEmpresaIdOrderByNomeAsc(user.getEmpresa().getId());
        } else if (user != null) {
            sistemas = sistemaRepository.findByOwnerUserIdOrderByNomeAsc(user.getId());
        } else {
            sistemas = sistemaRepository.findAllByOrderByNomeAsc();
        }
        return ResponseEntity.ok(sistemas.stream()
                .map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar sistema por ID", description = "Retorna detalhes do sistema incluindo mapeamento de branches e reviewers por tipo de alteracao.")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        return sistemaRepository.findById(id)
                .map(s -> ResponseEntity.ok(toResponse(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar sistema", description = "Cria um novo sistema/ambiente. Configure branches destino e reviewers por tipo (hotfix, bugfix, feat, etc.) e vincule a um repositorio.")
    public ResponseEntity<?> create(@RequestBody SistemaRequest req) {
        User user = getAuthenticatedUser();
        Sistema s = new Sistema();
        applyRequest(s, req);
        if (req.getRepoConfigId() != null) {
            repoConfigRepository.findById(req.getRepoConfigId()).ifPresent(s::setRepoConfig);
        }
        // Set tenant ownership
        if (user != null && user.getEmpresa() != null) {
            s.setEmpresa(user.getEmpresa());
        } else if (user != null) {
            s.setOwnerUser(user);
        }
        return ResponseEntity.ok(toResponse(sistemaRepository.save(s)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar sistema", description = "Atualiza configuracoes do sistema incluindo branches, reviewers e repositorio vinculado.")
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
        s.setDefaultReviewer(req.getDefaultReviewer());
        s.setBranchHotfix(req.getBranchHotfix() != null ? req.getBranchHotfix() : "main");
        s.setBranchBugfix(req.getBranchBugfix() != null ? req.getBranchBugfix() : "develop");
        s.setBranchFix(req.getBranchFix() != null ? req.getBranchFix() : "develop");
        s.setBranchFeat(req.getBranchFeat() != null ? req.getBranchFeat() : "develop");
        s.setBranchRefactor(req.getBranchRefactor() != null ? req.getBranchRefactor() : "develop");
        s.setBranchDocs(req.getBranchDocs() != null ? req.getBranchDocs() : "develop");
        s.setBranchChore(req.getBranchChore() != null ? req.getBranchChore() : "develop");
        // Reviewers por tipo (lista vira string separada por virgula)
        s.setReviewersHotfix(joinList(req.getReviewersHotfix()));
        s.setReviewersBugfix(joinList(req.getReviewersBugfix()));
        s.setReviewersFix(joinList(req.getReviewersFix()));
        s.setReviewersFeat(joinList(req.getReviewersFeat()));
        s.setReviewersRefactor(joinList(req.getReviewersRefactor()));
        s.setReviewersDocs(joinList(req.getReviewersDocs()));
        s.setReviewersChore(joinList(req.getReviewersChore()));
    }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        return String.join(",", list);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remover sistema", description = "Remove permanentemente um sistema. Tickets vinculados nao sao afetados.")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        if (user != null && !canManageResource(user, sistemaRepository.findById(id).orElse(null))) {
            return ResponseEntity.status(403).body(Map.of("error", "Sem permissao para remover este sistema"));
        }
        sistemaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Sistema removido"));
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    private boolean canManageEmpresa(User user) {
        if (user == null) return false;
        Role role = user.getRole();
        return Role.ADMIN == role || Role.GERENTE == role;
    }

    private boolean canManageResource(User user, Sistema sistema) {
        if (user == null || sistema == null) return true;
        if (user.getRole() == Role.ADMIN) return true;
        if (sistema.getEmpresa() != null && user.getEmpresa() != null
                && sistema.getEmpresa().getId().equals(user.getEmpresa().getId())) {
            return canManageEmpresa(user);
        }
        if (sistema.getOwnerUser() != null && sistema.getOwnerUser().getId().equals(user.getId())) {
            return true;
        }
        return false;
    }

    private Map<String, Object> toResponse(Sistema s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("nome", s.getNome());
        map.put("descricao", s.getDescricao());
        map.put("autoFixEnabled", s.isAutoFixEnabled());
        map.put("defaultReviewer", s.getDefaultReviewer());
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
        // Reviewer mapping
        Map<String, List<String>> reviewers = new LinkedHashMap<>();
        reviewers.put("hotfix", s.getReviewers("hotfix"));
        reviewers.put("bugfix", s.getReviewers("bugfix"));
        reviewers.put("fix", s.getReviewers("fix"));
        reviewers.put("feat", s.getReviewers("feat"));
        reviewers.put("refactor", s.getReviewers("refactor"));
        reviewers.put("docs", s.getReviewers("docs"));
        reviewers.put("chore", s.getReviewers("chore"));
        map.put("reviewerMapping", reviewers);
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
        private String defaultReviewer;
        private String branchHotfix;
        private String branchBugfix;
        private String branchFix;
        private String branchFeat;
        private String branchRefactor;
        private String branchDocs;
        private String branchChore;
        private List<String> reviewersHotfix;
        private List<String> reviewersBugfix;
        private List<String> reviewersFix;
        private List<String> reviewersFeat;
        private List<String> reviewersRefactor;
        private List<String> reviewersDocs;
        private List<String> reviewersChore;
    }
}
