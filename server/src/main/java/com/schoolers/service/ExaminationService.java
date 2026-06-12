package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Certificate;
import com.schoolers.model.ExamSchedule;
import com.schoolers.model.HallTicket;
import com.schoolers.model.Student;
import com.schoolers.repository.CertificateRepository;
import com.schoolers.repository.ExamScheduleRepository;
import com.schoolers.repository.HallTicketRepository;
import com.schoolers.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExaminationService {

    @Autowired
    private ExamScheduleRepository examScheduleRepository;

    @Autowired
    private HallTicketRepository hallTicketRepository;

    @Autowired
    private CertificateRepository certificateRepository;

    @Autowired
    private StudentRepository studentRepository;

    // ============================================================
    // EXAM SCHEDULES
    // ============================================================

    public ApiResponse<List<ExamSchedule>> getAllSchedules(String className, String examType, Long schoolId) {
        // Require a valid schoolId — never return cross-school data
        if (schoolId == null) return ApiResponse.success("Exam schedules retrieved", List.of());

        List<ExamSchedule> schedules;
        if (className != null && !className.isEmpty()) {
            schedules = examScheduleRepository.findByClassNameAndSchoolIdOrNull(className, schoolId);
        } else if (examType != null && !examType.isEmpty()) {
            schedules = examScheduleRepository.findByExamTypeAndSchoolIdOrNull(examType, schoolId);
        } else {
            schedules = examScheduleRepository.findBySchoolIdOrNull(schoolId);
        }
        return ApiResponse.success("Exam schedules retrieved", schedules);
    }

    public ApiResponse<ExamSchedule> createSchedule(Map<String, Object> body, Long schoolId) {
        String examName = (String) body.get("examName");
        if (examName == null || examName.isBlank()) return ApiResponse.error("Exam name is required");
        String className = (String) body.get("className");
        if (className == null || className.isBlank()) return ApiResponse.error("Class is required");
        String subject = (String) body.get("subject");
        if (subject == null || subject.isBlank()) return ApiResponse.error("Subject is required");
        String examDateStr = (String) body.get("examDate");
        if (examDateStr == null || examDateStr.isBlank()) return ApiResponse.error("Exam date is required");
        LocalDate examDate;
        try { examDate = LocalDate.parse(examDateStr); } catch (Exception e) { return ApiResponse.error("Invalid exam date format"); }
        int maxMarks = parseIntSafe(body.get("maxMarks"), 100);
        if (maxMarks <= 0) return ApiResponse.error("Max marks must be greater than zero");
        String instructions = (String) body.getOrDefault("instructions", "");
        if (instructions.length() > 2000) return ApiResponse.error("Instructions cannot exceed 2000 characters");

        ExamSchedule schedule = ExamSchedule.builder()
                .examName(examName)
                .examType((String) body.get("examType"))
                .className(className)
                .section((String) body.getOrDefault("section", ""))
                .subject(subject)
                .examDate(examDate)
                .startTime((String) body.get("startTime"))
                .endTime((String) body.get("endTime"))
                .hallNumber((String) body.get("hallNumber"))
                .maxMarks(maxMarks)
                .status((String) body.getOrDefault("status", "SCHEDULED"))
                .instructions(instructions)
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Exam schedule created", examScheduleRepository.save(schedule));
    }

    public ApiResponse<ExamSchedule> updateSchedule(Long id, Map<String, Object> body, Long schoolId) {
        Optional<ExamSchedule> opt = examScheduleRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Schedule not found");
        ExamSchedule s = opt.get();
        if (schoolId != null && s.getSchoolId() != null && !schoolId.equals(s.getSchoolId()))
            return ApiResponse.error("Access denied: schedule belongs to another school");
        if (body.containsKey("examName"))    s.setExamName((String) body.get("examName"));
        if (body.containsKey("examType"))    s.setExamType((String) body.get("examType"));
        if (body.containsKey("className"))   s.setClassName((String) body.get("className"));
        if (body.containsKey("section"))     s.setSection((String) body.get("section"));
        if (body.containsKey("subject"))     s.setSubject((String) body.get("subject"));
        if (body.containsKey("examDate"))    s.setExamDate(LocalDate.parse((String) body.get("examDate")));
        if (body.containsKey("startTime"))   s.setStartTime((String) body.get("startTime"));
        if (body.containsKey("endTime"))     s.setEndTime((String) body.get("endTime"));
        if (body.containsKey("hallNumber"))  s.setHallNumber((String) body.get("hallNumber"));
        if (body.containsKey("maxMarks"))    s.setMaxMarks(parseIntSafe(body.get("maxMarks"), s.getMaxMarks() != null ? s.getMaxMarks() : 100));
        if (body.containsKey("status"))      s.setStatus((String) body.get("status"));
        if (body.containsKey("instructions")) s.setInstructions((String) body.get("instructions"));
        return ApiResponse.success("Exam schedule updated", examScheduleRepository.save(s));
    }

    public ApiResponse<Void> deleteSchedule(Long id, Long schoolId) {
        ExamSchedule schedule = examScheduleRepository.findById(id).orElse(null);
        if (schedule == null) return ApiResponse.error("Schedule not found");
        if (schoolId != null && !schoolId.equals(schedule.getSchoolId()))
            return ApiResponse.error("Schedule not found");
        examScheduleRepository.deleteById(id);
        return ApiResponse.success("Exam schedule deleted", null);
    }

    // ============================================================
    // HALL TICKETS
    // ============================================================

    public ApiResponse<List<HallTicket>> getAllHallTickets(String className, String examType, Long schoolId) {
        List<HallTicket> tickets;
        if (schoolId != null && examType != null && !examType.isEmpty()) {
            tickets = hallTicketRepository.findByExamTypeAndSchoolIdOrderByCreatedAtDesc(examType, schoolId);
        } else if (schoolId != null) {
            tickets = hallTicketRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId);
        } else if (examType != null && !examType.isEmpty()) {
            tickets = hallTicketRepository.findByExamTypeOrderByCreatedAtDesc(examType);
        } else {
            tickets = hallTicketRepository.findAllByOrderByCreatedAtDesc();
        }
        return ApiResponse.success("Hall tickets retrieved", tickets);
    }

    public ApiResponse<List<HallTicket>> getHallTicketsByStudent(Long studentId, Long schoolId) {
        List<HallTicket> tickets = (schoolId != null)
                ? hallTicketRepository.findByStudentIdAndSchoolIdOrderByCreatedAtDesc(studentId, schoolId)
                : hallTicketRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
        return ApiResponse.success("Hall tickets retrieved", tickets);
    }

    public ApiResponse<HallTicket> createHallTicket(Map<String, Object> body, String generatedBy, Long schoolId) {
        String ticketNumber = generateTicketNumber();
        Object studentIdObj = body.get("studentId");
        if (studentIdObj == null) {
            return ApiResponse.error("studentId is required.");
        }
        long studentIdVal;
        try {
            studentIdVal = Long.parseLong(String.valueOf(studentIdObj));
        } catch (NumberFormatException e) {
            return ApiResponse.error("Invalid studentId format.");
        }
        HallTicket ticket = HallTicket.builder()
                .ticketNumber(ticketNumber)
                .studentId(studentIdVal)
                .studentName((String) body.get("studentName"))
                .rollNumber((String) body.get("rollNumber"))
                .className((String) body.get("className"))
                .section((String) body.getOrDefault("section", ""))
                .examName((String) body.get("examName"))
                .examType((String) body.get("examType"))
                .examSubjects((String) body.getOrDefault("examSubjects", "[]"))
                .academicYear((String) body.getOrDefault("academicYear", getCurrentAcademicYear()))
                .photoUrl((String) body.getOrDefault("photoUrl", ""))
                .dateOfBirth((String) body.getOrDefault("dateOfBirth", ""))
                .gender((String) body.getOrDefault("gender", ""))
                .registrationNumber((String) body.getOrDefault("registrationNumber", ""))
                .examCenter((String) body.getOrDefault("examCenter", "Main Campus"))
                .examCenterAddress((String) body.getOrDefault("examCenterAddress", "Schoolers Institution, Main Road"))
                .schoolId(schoolId)
                .generatedBy(generatedBy)
                .build();
        return ApiResponse.success("Hall ticket generated", hallTicketRepository.save(ticket));
    }

    @org.springframework.transaction.annotation.Transactional
    public ApiResponse<HallTicket> generateBulkHallTickets(Map<String, Object> body, String generatedBy, Long schoolId) {
        String className = (String) body.get("className");
        String section = (String) body.getOrDefault("section", "");
        String examName = (String) body.get("examName");
        String examType = (String) body.get("examType");
        String examSubjects = (String) body.getOrDefault("examSubjects", "[]");
        String academicYear = (String) body.getOrDefault("academicYear", getCurrentAcademicYear());

        List<Student> students;
        if (schoolId != null && section != null && !section.isEmpty()) {
            students = studentRepository.findBySchoolIdAndClassNameAndSection(schoolId, className, section);
        } else if (schoolId != null) {
            students = studentRepository.findBySchoolIdAndClassName(schoolId, className);
        } else if (section != null && !section.isEmpty()) {
            students = studentRepository.findByClassNameAndSection(className, section);
        } else {
            students = studentRepository.findByClassName(className);
        }

        List<Long> studentIds = students.stream().map(Student::getId).collect(Collectors.toList());
        Set<Long> studentsWithTicket = studentIds.isEmpty()
                ? Set.of()
                : ((schoolId != null)
                        ? hallTicketRepository.findByStudentIdInAndExamNameAndSchoolId(studentIds, examName, schoolId)
                        : hallTicketRepository.findByStudentIdInAndExamName(studentIds, examName))
                    .stream().map(HallTicket::getStudentId).collect(Collectors.toSet());

        List<HallTicket> tickets = new ArrayList<>();
        for (Student student : students) {
            if (studentsWithTicket.contains(student.getId())) {
                continue; // Skip if already generated
            }
            String dobStr = student.getDateOfBirth() != null ? student.getDateOfBirth().toString() : "";
            String examCenter = (String) body.getOrDefault("examCenter", "Main Campus");
            String examCenterAddress = (String) body.getOrDefault("examCenterAddress", "Schoolers Institution, Main Road");
            HallTicket ticket = HallTicket.builder()
                    .ticketNumber(generateTicketNumber())
                    .studentId(student.getId())
                    .studentName(student.getName())
                    .rollNumber(student.getRollNumber())
                    .className(student.getClassName())
                    .section(student.getSection())
                    .examName(examName)
                    .examType(examType)
                    .examSubjects(examSubjects)
                    .academicYear(academicYear)
                    .photoUrl(student.getPhotoUrl())
                    .dateOfBirth(dobStr)
                    .gender("")
                    .registrationNumber(student.getRollNumber())
                    .examCenter(examCenter)
                    .examCenterAddress(examCenterAddress)
                    .schoolId(schoolId)
                    .generatedBy(generatedBy)
                    .build();
            tickets.add(ticket);
        }
        hallTicketRepository.saveAll(tickets);
        return ApiResponse.success("Generated " + tickets.size() + " hall tickets", null);
    }

    public ApiResponse<Void> deleteHallTicket(Long id, Long schoolId) {
        Optional<HallTicket> opt = hallTicketRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Hall ticket not found");
        if (schoolId != null && opt.get().getSchoolId() != null && !schoolId.equals(opt.get().getSchoolId()))
            return ApiResponse.error("Access denied: hall ticket belongs to another school");
        hallTicketRepository.deleteById(id);
        return ApiResponse.success("Hall ticket deleted", null);
    }

    // ============================================================
    // CERTIFICATES
    // ============================================================

    public ApiResponse<List<Certificate>> getAllCertificates(String type, Long schoolId) {
        if (schoolId == null) return ApiResponse.success("Certificates retrieved", List.of());

        List<Certificate> certs;
        if (type != null && !type.isEmpty()) {
            certs = certificateRepository.findByCertificateTypeAndSchoolIdOrderByCreatedAtDesc(type, schoolId);
        } else {
            certs = certificateRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId);
        }
        return ApiResponse.success("Certificates retrieved", certs);
    }

    public ApiResponse<List<Certificate>> getCertificatesByStudent(Long studentId, Long schoolId) {
        if (schoolId == null) return ApiResponse.success("Certificates retrieved", List.of());
        List<Certificate> certs = certificateRepository
                .findByStudentIdAndSchoolIdOrderByCreatedAtDesc(studentId, schoolId);
        return ApiResponse.success("Certificates retrieved", certs);
    }

    public ApiResponse<Certificate> createCertificate(Map<String, Object> body, String generatedBy, Long schoolId) {
        String certId = generateCertificateId((String) body.get("certificateType"));
        Certificate cert = Certificate.builder()
                .certificateId(certId)
                .certificateType((String) body.get("certificateType"))
                .studentId(Long.parseLong(String.valueOf(body.get("studentId"))))
                .studentName((String) body.get("studentName"))
                .rollNumber((String) body.get("rollNumber"))
                .className((String) body.get("className"))
                .section((String) body.getOrDefault("section", ""))
                .issueDate(LocalDate.now())
                .academicYear((String) body.getOrDefault("academicYear", getCurrentAcademicYear()))
                .extraData((String) body.getOrDefault("extraData", "{}"))
                .purpose((String) body.getOrDefault("purpose", ""))
                .schoolId(schoolId)
                .generatedBy(generatedBy)
                .build();
        return ApiResponse.success("Certificate generated", certificateRepository.save(cert));
    }

    public ApiResponse<Certificate> verifyCertificate(Long id, String verifiedBy, Long schoolId) {
        Optional<Certificate> opt = certificateRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Certificate not found");
        Certificate cert = opt.get();
        if (schoolId != null && cert.getSchoolId() != null && !schoolId.equals(cert.getSchoolId()))
            return ApiResponse.error("Certificate not found");
        cert.setVerifiedBy(verifiedBy);
        cert.setVerifiedAt(java.time.LocalDateTime.now());
        return ApiResponse.success("Certificate verified", certificateRepository.save(cert));
    }

    public ApiResponse<Certificate> findByCertificateId(String certId) {
        return certificateRepository.findByCertificateId(certId)
                .map(c -> ApiResponse.success("Certificate found", c))
                .orElse(ApiResponse.error("Certificate not found"));
    }

    public ApiResponse<Void> deleteCertificate(Long id, Long schoolId) {
        Optional<Certificate> opt = certificateRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Certificate not found");
        if (schoolId != null && opt.get().getSchoolId() != null && !schoolId.equals(opt.get().getSchoolId()))
            return ApiResponse.error("Access denied: certificate belongs to another school");
        certificateRepository.deleteById(id);
        return ApiResponse.success("Certificate deleted", null);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private String generateTicketNumber() {
        String prefix = "HT";
        String timestamp = String.valueOf(System.currentTimeMillis()).substring(5);
        String random = String.format("%04d", new SecureRandom().nextInt(9999));
        return prefix + timestamp + random;
    }

    private String generateCertificateId(String type) {
        String prefix = switch (type) {
            case "BONAFIDE" -> "BON";
            case "TRANSFER" -> "TC";
            case "COURSE_COMPLETION" -> "CC";
            case "MARKS_MEMO" -> "MM";
            default -> "CERT";
        };
        String year = String.valueOf(LocalDate.now().getYear()).substring(2);
        String random = String.format("%06d", new SecureRandom().nextInt(999999));
        return prefix + year + random;
    }

    private String getCurrentAcademicYear() {
        int year = LocalDate.now().getYear();
        int month = LocalDate.now().getMonthValue();
        if (month >= 6) {
            return year + "-" + (year + 1);
        } else {
            return (year - 1) + "-" + year;
        }
    }

    /**
     * Safely parse any JSON numeric value to int.
     * JSON numbers often deserialise as Double (e.g. 100.0), which makes
     * Integer.parseInt(String.valueOf(100.0)) throw NumberFormatException.
     */
    private int parseIntSafe(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number) return ((Number) value).intValue();
        try { return Integer.parseInt(String.valueOf(value).replaceAll("\\..*", "")); }
        catch (NumberFormatException e) { return fallback; }
    }
}
