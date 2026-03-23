package com.triageai.security;

import com.triageai.model.ApiKey;
import com.triageai.repository.ApiKeyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private final ApiKeyRepository apiKeyRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // Only process /api/v1/** paths
        if (!request.getRequestURI().startsWith("/api/v1/")) {
            chain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader("X-API-Key");
        if (apiKey == null || apiKey.isBlank()) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Missing X-API-Key header\"}");
            return;
        }

        try {
            String hash = hashKey(apiKey);
            var key = apiKeyRepository.findByKeyHashAndActiveTrue(hash);

            if (key.isEmpty()) {
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Invalid API key\"}");
                return;
            }

            // Update last used
            ApiKey ak = key.get();
            ak.setLastUsedAt(LocalDateTime.now());
            apiKeyRepository.save(ak);

            // Set authentication
            var auth = new UsernamePasswordAuthenticationToken(
                    "api:" + ak.getName(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_API"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (Exception e) {
            response.setStatus(500);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Authentication failed\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    public static String hashKey(String key) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(key.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
