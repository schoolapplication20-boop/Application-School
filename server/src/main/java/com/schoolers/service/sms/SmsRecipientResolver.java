package com.schoolers.service.sms;

import com.schoolers.model.Attendance;
import com.schoolers.model.Student;
import com.schoolers.model.StudentFeeAssignment;
import com.schoolers.repository.AttendanceRepository;
import com.schoolers.repository.StudentFeeAssignmentRepository;
import com.schoolers.repository.StudentRepository;
import com.schoolers.sms.PhoneUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves a {@link TargetSelection} into a deduplicated list of {@link SmsRecipient}s, scoped
 * to the requesting school. Phone numbers come from {@code Student.parentMobile}, falling back
 * to {@code motherMobile} then {@code guardianMobile}, normalized to E.164 via {@link PhoneUtil}.
 * Students without a valid phone number are silently excluded (counted by the caller as skipped).
 */
@Service
public class SmsRecipientResolver {

    private final StudentRepository studentRepository;
    private final StudentFeeAssignmentRepository feeAssignmentRepository;
    private final AttendanceRepository attendanceRepository;

    @Value("${sms.default.country.code:+91}")
    private String defaultCountryCode;

    public SmsRecipientResolver(StudentRepository studentRepository,
                                 StudentFeeAssignmentRepository feeAssignmentRepository,
                                 AttendanceRepository attendanceRepository) {
        this.studentRepository = studentRepository;
        this.feeAssignmentRepository = feeAssignmentRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public List<SmsRecipient> resolve(Long schoolId, TargetSelection selection) {
        switch (selection.targetType()) {
            case SCHOOL:
                return fromStudents(studentRepository.findBySchoolId(schoolId));

            case CLASS:
                return fromStudents(studentRepository.findBySchoolIdAndClassName(schoolId, selection.className()));

            case SECTION:
                return fromStudents(studentRepository.findBySchoolIdAndClassNameAndSection(
                        schoolId, selection.className(), selection.section()));

            case STUDENTS: {
                List<Long> ids = selection.studentIds() != null ? selection.studentIds() : List.of();
                List<Student> students = studentRepository.findAllById(ids).stream()
                        .filter(s -> schoolId.equals(s.getSchoolId()))
                        .toList();
                return fromStudents(students);
            }

            case FEE_DUE: {
                List<StudentFeeAssignment.Status> dueStatuses = List.of(
                        StudentFeeAssignment.Status.PENDING,
                        StudentFeeAssignment.Status.OVERDUE,
                        StudentFeeAssignment.Status.PARTIAL);
                List<Long> studentIds = feeAssignmentRepository.findBySchoolIdAndStatusIn(schoolId, dueStatuses)
                        .stream().map(StudentFeeAssignment::getStudentId).distinct().toList();
                return fromStudents(studentRepository.findAllById(studentIds));
            }

            case ABSENTEES: {
                LocalDate date = selection.date() != null ? selection.date() : LocalDate.now();
                List<Long> studentIds = attendanceRepository.findBySchoolIdAndDateAndStatus(schoolId, date, Attendance.Status.ABSENT)
                        .stream().map(Attendance::getStudentId).distinct().toList();
                return fromStudents(studentRepository.findAllById(studentIds));
            }

            case CUSTOM: {
                List<String> phones = selection.customPhones() != null ? selection.customPhones() : List.of();
                Map<String, SmsRecipient> byPhone = new LinkedHashMap<>();
                for (String raw : phones) {
                    String phone = PhoneUtil.normalize(raw, defaultCountryCode);
                    if (phone != null) byPhone.putIfAbsent(phone, new SmsRecipient(null, null, phone));
                }
                return new ArrayList<>(byPhone.values());
            }

            default:
                return List.of();
        }
    }

    private List<SmsRecipient> fromStudents(List<Student> students) {
        Map<String, SmsRecipient> byPhone = new LinkedHashMap<>();
        for (Student s : students) {
            if (!Boolean.TRUE.equals(s.getIsActive())) continue;
            String raw = firstNonBlank(s.getParentMobile(), s.getMotherMobile(), s.getGuardianMobile());
            String phone = PhoneUtil.normalize(raw, defaultCountryCode);
            if (phone == null) continue;
            byPhone.putIfAbsent(phone, new SmsRecipient(s.getId(), s.getName(), phone));
        }
        return new ArrayList<>(byPhone.values());
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
