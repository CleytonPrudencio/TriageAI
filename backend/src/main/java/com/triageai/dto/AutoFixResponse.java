package com.triageai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class AutoFixResponse {
    private String status;
    private String branch;
    private String prUrl;
    private String message;
    private int filesChanged;
}
