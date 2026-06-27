package com.schoolers.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserDetailsServiceImpl userDetailsService;
    @Autowired private com.schoolers.service.TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String token = extractTokenFromRequest(request);

        if (token != null && jwtUtil.isValidToken(token) && !tokenBlacklistService.isRevoked(token)) {
            String username = jwtUtil.extractUsername(token);
            Long   userId   = jwtUtil.extractUserId(token);

            // Reject if the user's account has been deactivated since this token was issued
            if (tokenBlacklistService.isUserRevoked(userId)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Account deactivated.\"}");
                return;
            }

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                String role = jwtUtil.extractRole(token);
                String authority = (role != null && !role.isBlank()) ? "ROLE_" + role : "ROLE_USER";
                UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                        username, "",
                        java.util.Collections.singletonList(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority(authority)
                        )
                );
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                Map<String, Object> claimsDetails = new HashMap<>();
                claimsDetails.put("schoolId",      jwtUtil.extractSchoolId(token));
                claimsDetails.put("userId",        userId);
                claimsDetails.put("role",          role);
                // Forward the coordinator flag embedded at login so controllers can
                // check it from auth.getDetails() without an extra DB query per request.
                Object coordFlag = jwtUtil.extractClaim(token,
                        claims -> claims.get("isCoordinator"));
                claimsDetails.put("isCoordinator", Boolean.TRUE.equals(coordFlag));
                authToken.setDetails(claimsDetails);
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
