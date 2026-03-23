package com.triageai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GitConnectionRequest {
    @NotBlank
    private String provider;
    @NotBlank
    private String apiToken;
}
