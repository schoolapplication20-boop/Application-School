package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Homework;
import com.schoolers.repository.HomeworkRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Service
public class HomeworkService {

    @Autowired
    private HomeworkRepository homeworkRepository;

    public ApiResponse<List<Homework>> getAll(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(homeworkRepository.findBySchoolId(schoolId));
        return ApiResponse.success(homeworkRepository.findAll());
    }

    public ApiResponse<List<Homework>> getByTeacher(Long teacherId, Long schoolId) {
        if (schoolId != null) return ApiResponse.success(homeworkRepository.findBySchoolIdAndTeacherId(schoolId, teacherId));
        return ApiResponse.success(homeworkRepository.findByTeacherId(teacherId));
    }

    public ApiResponse<List<Homework>> getByClass(String classSection, Long schoolId) {
        if (schoolId != null) return ApiResponse.success(homeworkRepository.findBySchoolIdAndClassSection(schoolId, classSection));
        return ApiResponse.success(homeworkRepository.findByClassSection(classSection));
    }

    public ApiResponse<Homework> create(Map<String, Object> body, Long schoolId) {
        String title = str(body, "title", null);
        if (title == null || title.isBlank()) return ApiResponse.error("Title is required");

        Homework hw = Homework.builder()
                .title(title)
                .description(str(body, "description", null))
                .classSection(str(body, "classSection", null))
                .subject(str(body, "subject", null))
                .teacherId(longVal(body, "teacherId", null))
                .teacherName(str(body, "teacherName", null))
                .dueDate(parseDate(str(body, "dueDate", null)))
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Homework created", homeworkRepository.save(hw));
    }

    public ApiResponse<Homework> update(Long id, Map<String, Object> body, Long schoolId) {
        return homeworkRepository.findById(id)
                .map(hw -> {
                    if (schoolId != null && hw.getSchoolId() != null && !schoolId.equals(hw.getSchoolId()))
                        return ApiResponse.<Homework>error("Access denied: homework belongs to another school");
                    if (body.containsKey("title"))        hw.setTitle(str(body, "title", hw.getTitle()));
                    if (body.containsKey("description"))  hw.setDescription(str(body, "description", hw.getDescription()));
                    if (body.containsKey("classSection")) hw.setClassSection(str(body, "classSection", hw.getClassSection()));
                    if (body.containsKey("subject"))      hw.setSubject(str(body, "subject", hw.getSubject()));
                    if (body.containsKey("dueDate"))      hw.setDueDate(parseDate(str(body, "dueDate", null)));
                    if (body.containsKey("status")) {
                        try { hw.setStatus(Homework.Status.valueOf(str(body, "status", "ACTIVE").toUpperCase())); }
                        catch (IllegalArgumentException ignored) {}
                    }
                    return ApiResponse.success("Homework updated", homeworkRepository.save(hw));
                })
                .orElse(ApiResponse.error("Homework not found"));
    }

    public ApiResponse<String> delete(Long id, Long schoolId) {
        Homework hw = homeworkRepository.findById(id).orElse(null);
        if (hw == null) return ApiResponse.error("Homework not found");
        if (schoolId != null && hw.getSchoolId() != null && !schoolId.equals(hw.getSchoolId()))
            return ApiResponse.error("Access denied: homework belongs to another school");
        homeworkRepository.deleteById(id);
        return ApiResponse.success("Homework deleted", "Deleted");
    }

    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (DateTimeParseException e) { return null; }
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
