package com.triageai.dto;

import com.triageai.model.RepoConfig;
import lombok.Data;

@Data
public class RepoConfigResponse {
    private Long id;
    private String name;
    private String provider;
    private String repoOwner;
    private String repoName;
    private String defaultBranch;
    private String reviewerUsername;

    public static RepoConfigResponse from(RepoConfig rc) {
        RepoConfigResponse r = new RepoConfigResponse();
        r.setId(rc.getId());
        r.setName(rc.getName());
        r.setProvider(rc.getProvider().name());
        r.setRepoOwner(rc.getRepoOwner());
        r.setRepoName(rc.getRepoName());
        r.setDefaultBranch(rc.getDefaultBranch());
        r.setReviewerUsername(rc.getReviewerUsername());
        return r;
    }
}
