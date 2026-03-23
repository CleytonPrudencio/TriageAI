package com.triageai.dto;

import com.triageai.model.GitConnection;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class GitConnectionResponse {
    private Long id;
    private String provider;
    private String username;
    private String avatarUrl;
    private LocalDateTime connectedAt;

    public static GitConnectionResponse from(GitConnection gc) {
        GitConnectionResponse r = new GitConnectionResponse();
        r.setId(gc.getId());
        r.setProvider(gc.getProvider().name());
        r.setUsername(gc.getUsername());
        r.setAvatarUrl(gc.getAvatarUrl());
        r.setConnectedAt(gc.getConnectedAt());
        return r;
    }
}
