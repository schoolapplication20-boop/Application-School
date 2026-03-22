package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Timetable;
import com.schoolers.repository.TimetableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TimetableService {

    @Autowired
    private TimetableRepository timetableRepository;

    public ApiResponse<List<Timetable>> getAll() {
        return ApiResponse.success(timetableRepository.findAll());
    }

    public ApiResponse<List<Timetable>> getByTeacher(Long teacherId) {
        return ApiResponse.success(timetableRepository.findByTeacherId(teacherId));
    }

    public ApiResponse<List<Timetable>> getByClass(String classSection) {
        return ApiResponse.success(timetableRepository.findByClassSection(classSection));
    }

    public ApiResponse<Timetable> create(Map<String, Object> body) {
        String classSection = str(body, "classSection", null);
        String subject = str(body, "subject", null);
        String day = str(body, "day", null);
        String startTime = str(body, "startTime", null);
        String endTime = str(body, "endTime", null);

        if (classSection == null || classSection.isBlank()) return ApiResponse.error("Class/Section is required");
        if (subject == null || subject.isBlank()) return ApiResponse.error("Subject is required");
        if (day == null || day.isBlank()) return ApiResponse.error("Day is required");
        if (startTime == null || startTime.isBlank()) return ApiResponse.error("Start time is required");
        if (endTime == null || endTime.isBlank()) return ApiResponse.error("End time is required");

        Long teacherId = longVal(body, "teacherId", null);
        // Overlap check: same teacher, same day, overlapping time
        if (teacherId != null) {
            List<Timetable> existing = timetableRepository.findByTeacherIdAndDay(teacherId, day);
            int ns = toMin(startTime), ne = toMin(endTime);
            for (Timetable e : existing) {
                if (ns < toMin(e.getEndTime()) && ne > toMin(e.getStartTime())) {
                    return ApiResponse.error("Time slot overlaps with existing schedule for this teacher on " + day);
                }
            }
        }

        Timetable entry = Timetable.builder()
                .teacherId(teacherId)
                .teacherName(str(body, "teacherName", null))
                .classSection(classSection)
                .subject(subject)
                .day(day)
                .startTime(startTime)
                .endTime(endTime)
                .room(str(body, "room", null))
                .build();
        return ApiResponse.success("Timetable entry created", timetableRepository.save(entry));
    }

    public ApiResponse<Timetable> update(Long id, Map<String, Object> body) {
        return timetableRepository.findById(id)
                .map(entry -> {
                    if (body.containsKey("classSection")) entry.setClassSection(str(body, "classSection", entry.getClassSection()));
                    if (body.containsKey("subject"))      entry.setSubject(str(body, "subject", entry.getSubject()));
                    if (body.containsKey("day"))          entry.setDay(str(body, "day", entry.getDay()));
                    if (body.containsKey("startTime"))    entry.setStartTime(str(body, "startTime", entry.getStartTime()));
                    if (body.containsKey("endTime"))      entry.setEndTime(str(body, "endTime", entry.getEndTime()));
                    if (body.containsKey("room"))         entry.setRoom(str(body, "room", entry.getRoom()));
                    if (body.containsKey("teacherName"))  entry.setTeacherName(str(body, "teacherName", entry.getTeacherName()));
                    return ApiResponse.success("Timetable entry updated", timetableRepository.save(entry));
                })
                .orElse(ApiResponse.error("Timetable entry not found"));
    }

    public ApiResponse<String> delete(Long id) {
        if (!timetableRepository.existsById(id)) return ApiResponse.error("Timetable entry not found");
        timetableRepository.deleteById(id);
        return ApiResponse.success("Timetable entry deleted", "Deleted");
    }

    private int toMin(String t) {
        try {
            String[] parts = (t == null ? "00:00" : t).split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (Exception e) { return 0; }
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
