package com.triageai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GitRepoResponse {
    private String fullName;
    private String owner;
    private String name;
    private String defaultBranch;
    private boolean isPrivate;
    private String language;
    private String updatedAt;
}
