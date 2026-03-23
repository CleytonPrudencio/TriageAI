package com.triageai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RepoConfigRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String provider;

    @NotBlank
    private String repoOwner;

    @NotBlank
    private String repoName;

    private String apiToken; // Optional - if empty, fetched from GitConnection

    private String defaultBranch = "main";

    private String reviewerUsername;
}
