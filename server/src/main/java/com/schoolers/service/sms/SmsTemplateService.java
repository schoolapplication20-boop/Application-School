package com.schoolers.service.sms;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.sms.SmsCategory;
import com.schoolers.model.sms.SmsTemplate;
import com.schoolers.repository.sms.SmsTemplateRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SmsTemplateService {

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}");

    private final SmsTemplateRepository templateRepository;

    public SmsTemplateService(SmsTemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    public ApiResponse<List<SmsTemplate>> getAll(Long schoolId) {
        return ApiResponse.success(templateRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId));
    }

    public ApiResponse<List<SmsTemplate>> getActive(Long schoolId) {
        return ApiResponse.success(templateRepository.findBySchoolIdAndIsActiveTrueOrderByNameAsc(schoolId));
    }

    public ApiResponse<SmsTemplate> getById(Long schoolId, Long id) {
        return templateRepository.findByIdAndSchoolId(id, schoolId)
                .<ApiResponse<SmsTemplate>>map(ApiResponse::success)
                .orElse(ApiResponse.error("Template not found"));
    }

    public ApiResponse<SmsTemplate> create(Long schoolId, Long createdBy, Map<String, Object> body) {
        String name = str(body, "name");
        String content = str(body, "content");
        SmsCategory category = category(body);

        if (name == null || name.isBlank()) return ApiResponse.error("Template name is required");
        if (name.length() > 100) return ApiResponse.error("Template name cannot exceed 100 characters");
        if (content == null || content.isBlank()) return ApiResponse.error("Template content is required");
        if (category == null) return ApiResponse.error("A valid category is required");
        if (templateRepository.existsBySchoolIdAndNameIgnoreCase(schoolId, name.trim()))
            return ApiResponse.error("A template with this name already exists");

        SmsTemplate template = SmsTemplate.builder()
                .schoolId(schoolId)
                .name(name.trim())
                .category(category)
                .content(content)
                .isActive(true)
                .createdBy(createdBy)
                .build();
        return ApiResponse.success("Template created", templateRepository.save(template));
    }

    public ApiResponse<SmsTemplate> update(Long schoolId, Long id, Map<String, Object> body) {
        SmsTemplate template = templateRepository.findByIdAndSchoolId(id, schoolId).orElse(null);
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
        if (body.containsKey("content")) {
            String content = str(body, "content");
            if (content == null || content.isBlank()) return ApiResponse.error("Template content is required");
            template.setContent(content);
        }
        if (body.containsKey("category")) {
            SmsCategory category = category(body);
            if (category == null) return ApiResponse.error("A valid category is required");
            template.setCategory(category);
        }
        if (body.containsKey("isActive")) {
            template.setIsActive(Boolean.TRUE.equals(body.get("isActive")));
        }
        return ApiResponse.success("Template updated", templateRepository.save(template));
    }

    public ApiResponse<String> delete(Long schoolId, Long id) {
        SmsTemplate template = templateRepository.findByIdAndSchoolId(id, schoolId).orElse(null);
        if (template == null) return ApiResponse.error("Template not found");
        templateRepository.delete(template);
        return ApiResponse.success("Template deleted", "Deleted");
    }

    /** Replaces {@code {{variable}}} placeholders with values from {@code variables}; unresolved placeholders are left as-is. */
    public String render(String content, Map<String, Object> variables) {
        if (content == null) return null;
        if (variables == null || variables.isEmpty()) return content;
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(content);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            Object value = variables.get(matcher.group(1));
            String replacement = value != null
                    ? value.toString().replaceAll("[\\r\\n\\t]", " ").trim()
                    : matcher.group(0);
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private SmsCategory category(Map<String, Object> body) {
        Object raw = body.get("category");
        if (raw == null) return null;
        try {
            return SmsCategory.valueOf(raw.toString().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : null;
    }
}
