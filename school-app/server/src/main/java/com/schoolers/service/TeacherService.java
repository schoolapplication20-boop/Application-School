package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class TeacherService {

    @Autowired
    private ClassRoomRepository classRoomRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private MarksRepository marksRepository;

    // Classes
    public ApiResponse<List<ClassRoom>> getTeacherClasses(Long teacherId) {
        return ApiResponse.success(classRoomRepository.findByTeacherId(teacherId));
    }

    // Attendance
    public ApiResponse<String> markAttendance(List<Map<String, Object>> attendanceList) {
        for (Map<String, Object> record : attendanceList) {
            Long studentId = Long.valueOf(record.get("studentId").toString());
            Long classId = Long.valueOf(record.get("classId").toString());
            LocalDate date = LocalDate.parse(record.get("date").toString());
            String statusStr = record.get("status").toString();
            Attendance.Status status = Attendance.Status.valueOf(statusStr);

            Attendance existing = attendanceRepository.findByStudentIdAndClassIdAndDate(studentId, classId, date).orElse(null);
            if (existing != null) {
                existing.setStatus(status);
                attendanceRepository.save(existing);
            } else {
                Attendance attendance = Attendance.builder()
                        .studentId(studentId)
                        .classId(classId)
                        .date(date)
                        .status(status)
                        .build();
                attendanceRepository.save(attendance);
            }
        }
        return ApiResponse.success("Attendance marked successfully", "Saved");
    }

    public ApiResponse<List<Attendance>> getAttendanceByClassAndDate(Long classId, LocalDate date) {
        return ApiResponse.success(attendanceRepository.findByClassIdAndDate(classId, date));
    }

    // Assignments
    public ApiResponse<List<Assignment>> getTeacherAssignments(Long teacherId) {
        return ApiResponse.success(assignmentRepository.findByTeacherId(teacherId));
    }

    public ApiResponse<Assignment> createAssignment(Assignment assignment) {
        Assignment saved = assignmentRepository.save(assignment);
        return ApiResponse.success("Assignment created", saved);
    }

    public ApiResponse<Assignment> updateAssignment(Long id, Assignment updated) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    a.setTitle(updated.getTitle());
                    a.setDescription(updated.getDescription());
                    a.setDueDate(updated.getDueDate());
                    a.setStatus(updated.getStatus());
                    return ApiResponse.success(assignmentRepository.save(a));
                })
                .orElse(ApiResponse.error("Assignment not found"));
    }

    public ApiResponse<String> deleteAssignment(Long id) {
        if (!assignmentRepository.existsById(id)) {
            return ApiResponse.error("Assignment not found");
        }
        assignmentRepository.deleteById(id);
        return ApiResponse.success("Assignment deleted", "Deleted");
    }

    // Marks
    public ApiResponse<List<Marks>> getMarksByStudent(Long studentId) {
        return ApiResponse.success(marksRepository.findByStudentId(studentId));
    }

    public ApiResponse<Marks> addMarks(Marks marks) {
        Marks saved = marksRepository.save(marks);
        return ApiResponse.success("Marks saved", saved);
    }

    public ApiResponse<Marks> updateMarks(Long id, Marks updated) {
        return marksRepository.findById(id)
                .map(m -> {
                    m.setMarks(updated.getMarks());
                    m.setMaxMarks(updated.getMaxMarks());
                    m.setGrade(updated.getGrade());
                    return ApiResponse.success(marksRepository.save(m));
                })
                .orElse(ApiResponse.error("Marks record not found"));
    }
}
