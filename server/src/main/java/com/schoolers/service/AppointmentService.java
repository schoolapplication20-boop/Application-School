package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class AppointmentService {

    @Autowired private ParentTeacherAppointmentRepository appointmentRepository;
    @Autowired private StudentRepository                  studentRepository;
    @Autowired private TeacherRepository                  teacherRepository;
    @Autowired private UserRepository                     userRepository;
    @Autowired private ClassRoomRepository                classRoomRepository;

    // ── Student requests a meeting with their class teacher ───────────────────

    public ApiResponse<ParentTeacherAppointment> requestByStudent(
            Long studentUserId, String topic, LocalDate proposedDate,
            String proposedTime, String studentNote) {

        Student student = studentRepository.findByStudentUserId(studentUserId).orElse(null);
        if (student == null) return ApiResponse.error("Student profile not found.");

        Teacher classTeacher = resolveClassTeacher(student);
        if (classTeacher == null)
            return ApiResponse.error("No class teacher is assigned to your class yet. Please contact admin.");

        if (proposedDate == null || proposedDate.isBefore(LocalDate.now()))
            return ApiResponse.error("Please select a valid future date.");
        if (topic == null || topic.isBlank())
            return ApiResponse.error("Topic is required.");

        ParentTeacherAppointment appt = ParentTeacherAppointment.builder()
                .teacherId(classTeacher.getId())
                .teacherName(classTeacher.getName())
                .studentId(student.getId())
                .studentName(student.getName())
                .parentName(student.getParentName())
                .schoolId(student.getSchoolId())
                .requestedBy("STUDENT")
                .topic(topic.trim())
                .proposedDate(proposedDate)
                .proposedTime(proposedTime)
                .studentNote(studentNote != null ? studentNote.trim() : null)
                .status(ParentTeacherAppointment.Status.PENDING)
                .build();

        return ApiResponse.success("Appointment request sent to your class teacher.", appointmentRepository.save(appt));
    }

    // ── Teacher requests a meeting with a student/parent ─────────────────────

    public ApiResponse<ParentTeacherAppointment> requestByTeacher(
            Long teacherUserId, Long studentId, String topic,
            LocalDate proposedDate, String proposedTime, String teacherNote) {

        Teacher teacher = teacherRepository.findByUserId(teacherUserId).orElse(null);
        if (teacher == null) return ApiResponse.error("Teacher profile not found.");

        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return ApiResponse.error("Student not found.");

        // Multi-tenant guard
        if (teacher.getSchoolId() != null && !teacher.getSchoolId().equals(student.getSchoolId()))
            return ApiResponse.error("Student does not belong to your school.");

        // Verify teacher is the class teacher for this student
        Teacher classTeacher = resolveClassTeacher(student);
        if (classTeacher == null || !classTeacher.getId().equals(teacher.getId()))
            return ApiResponse.error("You are not the class teacher for this student.");

        if (proposedDate == null || proposedDate.isBefore(LocalDate.now()))
            return ApiResponse.error("Please select a valid future date.");
        if (topic == null || topic.isBlank())
            return ApiResponse.error("Topic is required.");

        ParentTeacherAppointment appt = ParentTeacherAppointment.builder()
                .teacherId(teacher.getId())
                .teacherName(teacher.getName())
                .studentId(student.getId())
                .studentName(student.getName())
                .parentName(student.getParentName())
                .schoolId(student.getSchoolId())
                .requestedBy("TEACHER")
                .topic(topic.trim())
                .proposedDate(proposedDate)
                .proposedTime(proposedTime)
                .teacherNote(teacherNote != null ? teacherNote.trim() : null)
                .status(ParentTeacherAppointment.Status.PENDING)
                .build();

        return ApiResponse.success("Appointment request sent to student.", appointmentRepository.save(appt));
    }

    // ── Teacher responds to a student's request ───────────────────────────────

    public ApiResponse<ParentTeacherAppointment> teacherRespond(
            Long teacherUserId, Long appointmentId,
            String status, String teacherNote,
            LocalDate confirmedDate, String confirmedTime) {

        Teacher teacher = teacherRepository.findByUserId(teacherUserId).orElse(null);
        if (teacher == null) return ApiResponse.error("Teacher profile not found.");

        ParentTeacherAppointment appt = appointmentRepository.findById(appointmentId).orElse(null);
        if (appt == null) return ApiResponse.error("Appointment not found.");
        if (!appt.getTeacherId().equals(teacher.getId()))
            return ApiResponse.error("This appointment does not belong to you.");
        if (appt.getStatus() != ParentTeacherAppointment.Status.PENDING)
            return ApiResponse.error("Only PENDING appointments can be responded to.");

        ParentTeacherAppointment.Status newStatus = parseStatus(status);
        if (newStatus == null || (newStatus != ParentTeacherAppointment.Status.ACCEPTED
                && newStatus != ParentTeacherAppointment.Status.REJECTED))
            return ApiResponse.error("Status must be ACCEPTED or REJECTED.");

        appt.setStatus(newStatus);
        if (teacherNote != null && !teacherNote.isBlank()) appt.setTeacherNote(teacherNote.trim());

        // When accepting, teacher may confirm or adjust the date/time
        if (newStatus == ParentTeacherAppointment.Status.ACCEPTED) {
            if (confirmedDate != null) appt.setProposedDate(confirmedDate);
            if (confirmedTime != null && !confirmedTime.isBlank()) appt.setProposedTime(confirmedTime);
        }

        String msg = newStatus == ParentTeacherAppointment.Status.ACCEPTED
                ? "Appointment accepted." : "Appointment declined.";
        return ApiResponse.success(msg, appointmentRepository.save(appt));
    }

    // ── Student cancels their own request or a teacher-initiated one ──────────

    public ApiResponse<ParentTeacherAppointment> studentCancel(Long studentUserId, Long appointmentId) {
        Student student = studentRepository.findByStudentUserId(studentUserId).orElse(null);
        if (student == null) return ApiResponse.error("Student profile not found.");

        ParentTeacherAppointment appt = appointmentRepository.findById(appointmentId).orElse(null);
        if (appt == null) return ApiResponse.error("Appointment not found.");
        if (!appt.getStudentId().equals(student.getId()))
            return ApiResponse.error("This appointment does not belong to you.");
        if (appt.getStatus() == ParentTeacherAppointment.Status.CANCELLED)
            return ApiResponse.error("Appointment is already cancelled.");
        if (appt.getStatus() == ParentTeacherAppointment.Status.REJECTED)
            return ApiResponse.error("Appointment was already declined.");

        appt.setStatus(ParentTeacherAppointment.Status.CANCELLED);
        return ApiResponse.success("Appointment cancelled.", appointmentRepository.save(appt));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public ApiResponse<List<ParentTeacherAppointment>> getStudentAppointments(Long studentUserId) {
        Student student = studentRepository.findByStudentUserId(studentUserId).orElse(null);
        if (student == null) return ApiResponse.success(List.of());
        return ApiResponse.success(appointmentRepository.findByStudentIdOrderByCreatedAtDesc(student.getId()));
    }

    public ApiResponse<List<ParentTeacherAppointment>> getTeacherAppointments(Long teacherUserId) {
        Teacher teacher = teacherRepository.findByUserId(teacherUserId).orElse(null);
        if (teacher == null) return ApiResponse.success(List.of());
        return ApiResponse.success(appointmentRepository.findByTeacherIdOrderByCreatedAtDesc(teacher.getId()));
    }

    // ── Get teacher's class students for teacher-initiated request form ───────

    public ApiResponse<List<Student>> getClassStudentsForTeacher(Long teacherUserId) {
        Teacher teacher = teacherRepository.findByUserId(teacherUserId).orElse(null);
        if (teacher == null) return ApiResponse.error("Teacher profile not found.");

        if (teacher.getPrimaryClassId() == null)
            return ApiResponse.error("You are not assigned as a class teacher.");

        ClassRoom cls = classRoomRepository.findById(teacher.getPrimaryClassId()).orElse(null);
        if (cls == null) return ApiResponse.success(List.of());

        String name    = cls.getName();
        String section = cls.getSection();
        String combined = name + "-" + (section != null ? section : "");

        List<Student> students = cls.getSchoolId() != null
                ? studentRepository.findBySchoolIdAndClassFlexible(cls.getSchoolId(), combined, name, section)
                : studentRepository.findByClassFlexible(combined, name, section);

        students.sort(Comparator.comparing(Student::getName));
        return ApiResponse.success(students);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Finds the class teacher for a student by matching the student's class/section
     * to a teacher's primaryClassId. Returns null if none is assigned.
     */
    private Teacher resolveClassTeacher(Student student) {
        if (student.getSchoolId() == null) return null;

        // Find the classroom matching the student's class and section
        ClassRoom cls = null;
        if (student.getClassName() != null) {
            cls = student.getSection() != null
                ? classRoomRepository.findBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(
                        student.getSchoolId(), student.getClassName(), student.getSection()).orElse(null)
                : classRoomRepository.findByNameIgnoreCaseAndSectionIgnoreCase(
                        student.getClassName(), null).orElse(null);
        }

        if (cls == null) return null;
        return teacherRepository.findByPrimaryClassId(cls.getId()).orElse(null);
    }

    private ParentTeacherAppointment.Status parseStatus(String s) {
        try { return ParentTeacherAppointment.Status.valueOf(s.toUpperCase()); }
        catch (Exception e) { return null; }
    }
}
