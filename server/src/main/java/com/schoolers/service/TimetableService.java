package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Timetable;
import com.schoolers.repository.TimetableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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

    @Transactional
    public ApiResponse<List<Timetable>> createBulk(List<Map<String, Object>> body) {
        List<Timetable> toSave    = new ArrayList<>();
        List<Timetable> existing  = timetableRepository.findAll();
        List<Timetable> batchSoFar = new ArrayList<>();
        List<String>    conflicts  = new ArrayList<>();

        for (int i = 0; i < body.size(); i++) {
            Map<String, Object> item = body.get(i);
            String classSection = str(item, "classSection", null);
            String subject      = str(item, "subject",      null);
            String day          = str(item, "day",          null);
            String startTime    = str(item, "startTime",    null);
            String endTime      = str(item, "endTime",      null);
            Long   teacherId    = longVal(item, "teacherId", null);
            String teacherName  = str(item, "teacherName",  "");
            String room         = str(item, "room",         null);

            if (classSection == null || subject == null || day == null
                    || startTime == null || endTime == null) {
                conflicts.add("Entry " + (i + 1) + ": missing required fields");
                continue;
            }
            int ns = toMin(startTime), ne = toMin(endTime);
            if (ns >= ne) {
                conflicts.add("Entry " + (i + 1) + " (" + classSection + " " + day + "): end time must be after start time");
                continue;
            }

            // Teacher overlap — vs DB
            if (teacherId != null) {
                for (Timetable e : existing) {
                    if (teacherId.equals(e.getTeacherId()) && day.equals(e.getDay())
                            && ns < toMin(e.getEndTime()) && ne > toMin(e.getStartTime())) {
                        conflicts.add("Entry " + (i + 1) + ": Teacher '" + teacherName + "' overlaps '"
                                + e.getSubject() + "' (" + e.getClassSection() + ") on " + day
                                + " " + e.getStartTime() + "–" + e.getEndTime());
                    }
                }
                // Teacher overlap — within batch
                for (Timetable e : batchSoFar) {
                    if (teacherId.equals(e.getTeacherId()) && day.equals(e.getDay())
                            && ns < toMin(e.getEndTime()) && ne > toMin(e.getStartTime())) {
                        conflicts.add("Entry " + (i + 1) + ": Teacher '" + teacherName + "' batch conflict on "
                                + day + " " + startTime + "–" + endTime);
                    }
                }
            }

            // Room overlap — vs DB
            if (room != null && !room.isBlank()) {
                for (Timetable e : existing) {
                    if (room.equals(e.getRoom()) && day.equals(e.getDay())
                            && ns < toMin(e.getEndTime()) && ne > toMin(e.getStartTime())) {
                        conflicts.add("Entry " + (i + 1) + ": Room '" + room + "' already booked on "
                                + day + " " + e.getStartTime() + "–" + e.getEndTime());
                    }
                }
                // Room overlap — within batch
                for (Timetable e : batchSoFar) {
                    if (room.equals(e.getRoom()) && day.equals(e.getDay())
                            && ns < toMin(e.getEndTime()) && ne > toMin(e.getStartTime())) {
                        conflicts.add("Entry " + (i + 1) + ": Room '" + room + "' batch conflict on " + day);
                    }
                }
            }

            Timetable entry = Timetable.builder()
                    .teacherId(teacherId)
                    .teacherName(teacherName)
                    .classSection(classSection)
                    .subject(subject)
                    .day(day)
                    .startTime(startTime)
                    .endTime(endTime)
                    .room(room)
                    .build();
            toSave.add(entry);
            batchSoFar.add(entry);
        }

        if (!conflicts.isEmpty()) {
            return ApiResponse.error("Conflicts detected: " + String.join("; ", conflicts));
        }

        List<Timetable> saved = timetableRepository.saveAll(toSave);
        return ApiResponse.success(saved.size() + " timetable entries created", saved);
    }

    public ApiResponse<String> delete(Long id) {
        if (!timetableRepository.existsById(id)) return ApiResponse.error("Timetable entry not found");
        timetableRepository.deleteById(id);
        return ApiResponse.success("Timetable entry deleted", "Deleted");
    }

    private int toMin(String t) {
        try {
            if (t == null || t.isBlank()) return 0;
            String[] parts = t.split(":");
            if (parts.length != 2) return 0;
            return Integer.parseInt(parts[0].trim()) * 60 + Integer.parseInt(parts[1].trim());
        } catch (NumberFormatException e) {
            return 0;
        }
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
