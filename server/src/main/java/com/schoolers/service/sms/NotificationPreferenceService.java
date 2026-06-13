package com.schoolers.service.sms;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.sms.NotificationPreference;
import com.schoolers.model.sms.SmsCategory;
import com.schoolers.repository.sms.NotificationPreferenceRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Per-school, per-category SMS toggle settings. Phase 1 exposes a settings UI for these; Phase 2 automated triggers will read {@link #isEnabled}. */
@Service
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;

    public NotificationPreferenceService(NotificationPreferenceRepository preferenceRepository) {
        this.preferenceRepository = preferenceRepository;
    }

    /** Returns one row per {@link SmsCategory}, filling in defaults (smsEnabled=true, unsaved) for categories without a row yet. */
    public ApiResponse<List<NotificationPreference>> getAll(Long schoolId) {
        Map<SmsCategory, NotificationPreference> existing = preferenceRepository.findBySchoolId(schoolId).stream()
                .collect(Collectors.toMap(NotificationPreference::getCategory, p -> p));

        List<NotificationPreference> result = new ArrayList<>();
        for (SmsCategory category : SmsCategory.values()) {
            result.add(existing.getOrDefault(category, NotificationPreference.builder()
                    .schoolId(schoolId)
                    .category(category)
                    .smsEnabled(true)
                    .build()));
        }
        return ApiResponse.success(result);
    }

    public ApiResponse<NotificationPreference> update(Long schoolId, String categoryName, boolean smsEnabled) {
        SmsCategory category;
        try {
            category = SmsCategory.valueOf(categoryName.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("Invalid notification category: " + categoryName);
        }

        NotificationPreference pref = preferenceRepository.findBySchoolIdAndCategory(schoolId, category)
                .orElseGet(() -> NotificationPreference.builder()
                        .schoolId(schoolId)
                        .category(category)
                        .build());
        pref.setSmsEnabled(smsEnabled);
        return ApiResponse.success("Preference updated", preferenceRepository.save(pref));
    }

    /** Whether SMS is enabled for the given category; defaults to {@code true} when no preference row exists yet. */
    public boolean isEnabled(Long schoolId, SmsCategory category) {
        return preferenceRepository.findBySchoolIdAndCategory(schoolId, category)
                .map(NotificationPreference::getSmsEnabled)
                .orElse(true);
    }
}
