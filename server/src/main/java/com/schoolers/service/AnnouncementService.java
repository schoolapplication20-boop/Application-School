package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Announcement;
import com.schoolers.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AnnouncementService {

    @Autowired
    private AnnouncementRepository announcementRepository;

    public ApiResponse<List<Announcement>> getAll(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(announcementRepository.findBySchoolIdAndIsActiveTrueOrderByCreatedAtDesc(schoolId));
        }
        return ApiResponse.success(announcementRepository.findByIsActiveTrueOrderByCreatedAtDesc());
    }

    public ApiResponse<List<Announcement>> getForRole(String role, Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(
                announcementRepository.findBySchoolIdAndTargetRoleInOrderByCreatedAtDesc(
                    schoolId, List.of("ALL", role.toUpperCase()))
            );
        }
        return ApiResponse.success(
            announcementRepository.findByTargetRoleInOrderByCreatedAtDesc(List.of("ALL", role.toUpperCase()))
        );
    }

    public ApiResponse<Announcement> create(Map<String, Object> body, Long schoolId) {
        String title = str(body, "title", null);
        String content = str(body, "content", null);
        if (title == null || title.isBlank()) return ApiResponse.error("Title is required");
        if (content == null || content.isBlank()) return ApiResponse.error("Content is required");

        Announcement announcement = Announcement.builder()
                .title(title)
                .content(content)
                .targetRole(str(body, "targetRole", "ALL"))
                .createdBy(str(body, "createdBy", null))
                .createdById(longVal(body, "createdById", null))
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Announcement created", announcementRepository.save(announcement));
    }

    public ApiResponse<Announcement> update(Long id, Map<String, Object> body, Long schoolId) {
        return announcementRepository.findById(id)
                .map(a -> {
                    if (schoolId != null && a.getSchoolId() != null && !schoolId.equals(a.getSchoolId()))
                        return ApiResponse.<Announcement>error("Access denied: announcement belongs to another school");
                    if (body.containsKey("title"))      a.setTitle(str(body, "title", a.getTitle()));
                    if (body.containsKey("content"))    a.setContent(str(body, "content", a.getContent()));
                    if (body.containsKey("targetRole")) a.setTargetRole(str(body, "targetRole", a.getTargetRole()));
                    if (body.containsKey("isActive"))   a.setIsActive(Boolean.TRUE.equals(body.get("isActive")));
                    return ApiResponse.success("Announcement updated", announcementRepository.save(a));
                })
                .orElse(ApiResponse.error("Announcement not found"));
    }

    public ApiResponse<String> delete(Long id, Long schoolId) {
        Announcement a = announcementRepository.findById(id).orElse(null);
        if (a == null) return ApiResponse.error("Announcement not found");
        if (schoolId != null && a.getSchoolId() != null && !schoolId.equals(a.getSchoolId()))
            return ApiResponse.error("Access denied: announcement belongs to another school");
        announcementRepository.deleteById(id);
        return ApiResponse.success("Announcement deleted", "Deleted");
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }
}
