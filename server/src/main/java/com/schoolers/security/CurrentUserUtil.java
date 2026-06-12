package com.schoolers.security;

import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Resolves the authenticated user's schoolId, preferring the JWT claims embedded in
 * {@link Authentication#getDetails()} by {@link JwtFilter}, and falling back to a DB
 * lookup only when the details map is absent (e.g. tests / mock auth).
 */
@Component
public class CurrentUserUtil {

    @Autowired private UserRepository userRepository;

    public Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        if (auth.getDetails() instanceof Map) {
            Object v = ((Map<?, ?>) auth.getDetails()).get("schoolId");
            if (v != null) {
                if (v instanceof Long) return (Long) v;
                try {
                    return Long.parseLong(v.toString());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId)
                .orElse(null);
    }
}
