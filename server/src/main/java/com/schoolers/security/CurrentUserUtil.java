package com.schoolers.security;

import com.schoolers.repository.SchoolRepository;
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

    @Autowired private UserRepository  userRepository;
    @Autowired private SchoolRepository schoolRepository;

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

    /** Resolves the authenticated user's id, preferring the JWT claims and falling back to a DB lookup by email. */
    public Long getCurrentUserId(Authentication auth) {
        if (auth == null) return null;
        if (auth.getDetails() instanceof Map) {
            Object v = ((Map<?, ?>) auth.getDetails()).get("userId");
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
                .map(com.schoolers.model.User::getId)
                .orElse(null);
    }

    /**
     * Resolves a school identifier (which may be the display school_id stored in users.school_id,
     * e.g. 3) to the actual schools.id primary key (e.g. 23) needed by FK-constrained tables such
     * as school_diary_config and report_card_attendance.
     *
     * <p>Resolution order:
     * <ol>
     *   <li>findBySchoolId(displayId) — matches schools.school_id column (display number)</li>
     *   <li>findById(displayId)        — in case the value already is the PK</li>
     *   <li>Return the original value unchanged</li>
     * </ol>
     *
     * <p>Previously duplicated verbatim in AdminController and ClassDiaryController.
     * Centralised here so all callers stay in sync.
     */
    public Long resolveSchoolPk(Long schoolIdFromJwtOrUser) {
        if (schoolIdFromJwtOrUser == null) return null;
        try {
            var byDisplay = schoolRepository.findBySchoolId(schoolIdFromJwtOrUser.intValue());
            if (byDisplay.isPresent()) return byDisplay.get().getId();
        } catch (Exception ignored) {}
        return schoolRepository.findById(schoolIdFromJwtOrUser)
                .map(com.schoolers.model.School::getId)
                .orElse(schoolIdFromJwtOrUser);
    }
}
