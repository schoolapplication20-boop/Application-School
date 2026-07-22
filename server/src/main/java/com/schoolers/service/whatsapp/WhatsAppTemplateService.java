package com.schoolers.service.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.whatsapp.WhatsAppApprovalStatus;
import com.schoolers.model.whatsapp.WhatsAppCategory;
import com.schoolers.model.whatsapp.WhatsAppTemplate;
import com.schoolers.repository.whatsapp.WhatsAppTemplateRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * CRUD for WhatsApp templates. Unlike {@code SmsTemplateService}, there is no free-text
 * {@code render(...)} method here — a template maps to a Meta-approved message template, and its
 * variables are sent as positional parameters to Meta, not substituted into body text by us.
 */
@Service
public class WhatsAppTemplateService {

    private final WhatsAppTemplateRepository templateRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public WhatsAppTemplateService(WhatsAppTemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    public ApiResponse<List<WhatsAppTemplate>> getAll(Long schoolId) {
        return ApiResponse.success(templateRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId));
    }

    public ApiResponse<List<WhatsAppTemplate>> getActive(Long schoolId) {
        return ApiResponse.success(templateRepository.findBySchoolIdAndIsActiveTrueOrderByNameAsc(schoolId));
    }

    public ApiResponse<WhatsAppTemplate> getById(Long schoolId, Long id) {
        return templateRepository.findByIdAndSchoolId(id, schoolId)
                .<ApiResponse<WhatsAppTemplate>>map(ApiResponse::success)
                .orElse(ApiResponse.error("Template not found"));
    }

    public ApiResponse<WhatsAppTemplate> create(Long schoolId, Long createdBy, Map<String, Object> body) {
        String name = str(body, "name");
        String metaTemplateName = str(body, "metaTemplateName");
        WhatsAppCategory category = category(body);

        if (name == null || name.isBlank()) return ApiResponse.error("Template name is required");
        if (name.length() > 100) return ApiResponse.error("Template name cannot exceed 100 characters");
        if (metaTemplateName == null || metaTemplateName.isBlank())
            return ApiResponse.error("The exact Meta-approved template name is required");
        if (category == null) return ApiResponse.error("A valid category is required");
        if (templateRepository.existsBySchoolIdAndNameIgnoreCase(schoolId, name.trim()))
            return ApiResponse.error("A template with this name already exists");

        String variableLabelsJson = toJson(body.get("variableLabels"));

        WhatsAppTemplate template = WhatsAppTemplate.builder()
                .schoolId(schoolId)
                .name(name.trim())
                .category(category)
                .metaTemplateName(metaTemplateName.trim())
                .metaLanguageCode(strOrDefault(body, "metaLanguageCode", "en"))
                .variableLabels(variableLabelsJson)
                .hasUrlButton(Boolean.TRUE.equals(body.get("hasUrlButton")))
                .contentPreview(str(body, "contentPreview"))
                .approvalStatus(WhatsAppApprovalStatus.PENDING)
                .isActive(true)
                .createdBy(createdBy)
                .build();
        return ApiResponse.success("Template created", templateRepository.save(template));
    }

    public ApiResponse<WhatsAppTemplate> update(Long schoolId, Long id, Map<String, Object> body) {
        WhatsAppTemplate template = templateRepository.findByIdAndSchoolId(id, schoolId).orElse(null);
        if (template == null) return ApiResponse.error("Template not found");

        if (body.containsKey("name")) {
            String name = str(body, "name");
            if (name == null || name.isBlank()) return ApiResponse.error("Template name is required");
            if (name.length() > 100) return ApiResponse.error("Template name cannot exceed 100 characters");
            if (!name.trim().equalsIgnoreCase(template.getName())
                    && templateRepository.existsBySchoolIdAndNameIgnoreCase(schoolId, name.trim()))
                return ApiResponse.error("A template with this name already exists");
            template.setName(name.trim());
        }
        if (body.containsKey("metaTemplateName")) {
            String metaTemplateName = str(body, "metaTemplateName");
            if (metaTemplateName == null || metaTemplateName.isBlank())
                return ApiResponse.error("The exact Meta-approved template name is required");
            template.setMetaTemplateName(metaTemplateName.trim());
        }
        if (body.containsKey("metaLanguageCode")) {
            String lang = str(body, "metaLanguageCode");
            template.setMetaLanguageCode(lang != null && !lang.isBlank() ? lang.trim() : "en");
        }
        if (body.containsKey("category")) {
            WhatsAppCategory category = category(body);
            if (category == null) return ApiResponse.error("A valid category is required");
            template.setCategory(category);
        }
        if (body.containsKey("variableLabels")) {
            template.setVariableLabels(toJson(body.get("variableLabels")));
        }
        if (body.containsKey("hasUrlButton")) {
            template.setHasUrlButton(Boolean.TRUE.equals(body.get("hasUrlButton")));
        }
        if (body.containsKey("contentPreview")) {
            template.setContentPreview(str(body, "contentPreview"));
        }
        if (body.containsKey("approvalStatus")) {
            WhatsAppApprovalStatus status = approvalStatus(body);
            if (status == null) return ApiResponse.error("A valid approval status is required");
            template.setApprovalStatus(status);
        }
        if (body.containsKey("isActive")) {
            template.setIsActive(Boolean.TRUE.equals(body.get("isActive")));
        }
        return ApiResponse.success("Template updated", templateRepository.save(template));
    }

    public ApiResponse<String> delete(Long schoolId, Long id) {
        WhatsAppTemplate template = templateRepository.findByIdAndSchoolId(id, schoolId).orElse(null);
        if (template == null) return ApiResponse.error("Template not found");
        templateRepository.delete(template);
        return ApiResponse.success("Template deleted", "Deleted");
    }

    private WhatsAppCategory category(Map<String, Object> body) {
        Object raw = body.get("category");
        if (raw == null) return null;
        try {
            return WhatsAppCategory.valueOf(raw.toString().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private WhatsAppApprovalStatus approvalStatus(Map<String, Object> body) {
        Object raw = body.get("approvalStatus");
        if (raw == null) return null;
        try {
            return WhatsAppApprovalStatus.valueOf(raw.toString().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }

    private String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : null;
    }

    private String strOrDefault(Map<String, Object> map, String key, String fallback) {
        String v = str(map, key);
        return v != null && !v.isBlank() ? v.trim() : fallback;
    }
}
