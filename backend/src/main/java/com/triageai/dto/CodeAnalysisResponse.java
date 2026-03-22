package com.triageai.dto;

import lombok.Data;

import java.util.List;

@Data
public class CodeAnalysisResponse {
    private List<FileFix> fixes;

    @Data
    public static class FileFix {
        private String filePath;
        private String originalCode;
        private String fixedCode;
        private String explanation;
    }
}
