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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

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

    public ApiResponse<List<ExamSchedule>> getAllSchedules(String className, String examType) {
        List<ExamSchedule> schedules;
        if (className != null && !className.isEmpty()) {
            schedules = examScheduleRepository.findByClassNameOrderByExamDateAsc(className);
        } else if (examType != null && !examType.isEmpty()) {
            schedules = examScheduleRepository.findByExamTypeOrderByExamDateAsc(examType);
        } else {
            schedules = examScheduleRepository.findAllByOrderByExamDateAsc();
        }
        return ApiResponse.success("Exam schedules retrieved", schedules);
    }

    public ApiResponse<ExamSchedule> createSchedule(Map<String, Object> body) {
        ExamSchedule schedule = ExamSchedule.builder()
                .examName((String) body.get("examName"))
                .examType((String) body.get("examType"))
                .className((String) body.get("className"))
                .section((String) body.getOrDefault("section", ""))
                .subject((String) body.get("subject"))
                .examDate(LocalDate.parse((String) body.get("examDate")))
                .startTime((String) body.get("startTime"))
                .endTime((String) body.get("endTime"))
                .hallNumber((String) body.get("hallNumber"))
                .maxMarks(Integer.parseInt(String.valueOf(body.getOrDefault("maxMarks", 100))))
                .status((String) body.getOrDefault("status", "SCHEDULED"))
                .instructions((String) body.getOrDefault("instructions", ""))
                .build();
        return ApiResponse.success("Exam schedule created", examScheduleRepository.save(schedule));
    }

    public ApiResponse<ExamSchedule> updateSchedule(Long id, Map<String, Object> body) {
        Optional<ExamSchedule> opt = examScheduleRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Schedule not found");
        ExamSchedule s = opt.get();
        if (body.containsKey("examName"))    s.setExamName((String) body.get("examName"));
        if (body.containsKey("examType"))    s.setExamType((String) body.get("examType"));
        if (body.containsKey("className"))   s.setClassName((String) body.get("className"));
        if (body.containsKey("section"))     s.setSection((String) body.get("section"));
        if (body.containsKey("subject"))     s.setSubject((String) body.get("subject"));
        if (body.containsKey("examDate"))    s.setExamDate(LocalDate.parse((String) body.get("examDate")));
        if (body.containsKey("startTime"))   s.setStartTime((String) body.get("startTime"));
        if (body.containsKey("endTime"))     s.setEndTime((String) body.get("endTime"));
        if (body.containsKey("hallNumber"))  s.setHallNumber((String) body.get("hallNumber"));
        if (body.containsKey("maxMarks"))    s.setMaxMarks(Integer.parseInt(String.valueOf(body.get("maxMarks"))));
        if (body.containsKey("status"))      s.setStatus((String) body.get("status"));
        if (body.containsKey("instructions")) s.setInstructions((String) body.get("instructions"));
        return ApiResponse.success("Exam schedule updated", examScheduleRepository.save(s));
    }

    public ApiResponse<Void> deleteSchedule(Long id) {
        if (!examScheduleRepository.existsById(id)) return ApiResponse.error("Schedule not found");
        examScheduleRepository.deleteById(id);
        return ApiResponse.success("Exam schedule deleted", null);
    }

    // ============================================================
    // HALL TICKETS
    // ============================================================

    public ApiResponse<List<HallTicket>> getAllHallTickets(String className, String examType) {
        List<HallTicket> tickets;
        if (examType != null && !examType.isEmpty()) {
            tickets = hallTicketRepository.findByExamTypeOrderByCreatedAtDesc(examType);
        } else {
            tickets = hallTicketRepository.findAllByOrderByCreatedAtDesc();
        }
        return ApiResponse.success("Hall tickets retrieved", tickets);
    }

    public ApiResponse<List<HallTicket>> getHallTicketsByStudent(Long studentId) {
        return ApiResponse.success("Hall tickets retrieved",
                hallTicketRepository.findByStudentIdOrderByCreatedAtDesc(studentId));
    }

    public ApiResponse<HallTicket> createHallTicket(Map<String, Object> body, String generatedBy) {
        String ticketNumber = generateTicketNumber();
        HallTicket ticket = HallTicket.builder()
                .ticketNumber(ticketNumber)
                .studentId(Long.parseLong(String.valueOf(body.get("studentId"))))
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
                .generatedBy(generatedBy)
                .build();
        return ApiResponse.success("Hall ticket generated", hallTicketRepository.save(ticket));
    }

    public ApiResponse<HallTicket> generateBulkHallTickets(Map<String, Object> body, String generatedBy) {
        String className = (String) body.get("className");
        String section = (String) body.getOrDefault("section", "");
        String examName = (String) body.get("examName");
        String examType = (String) body.get("examType");
        String examSubjects = (String) body.getOrDefault("examSubjects", "[]");
        String academicYear = (String) body.getOrDefault("academicYear", getCurrentAcademicYear());

        List<Student> students;
        if (section != null && !section.isEmpty()) {
            students = studentRepository.findByClassNameAndSection(className, section);
        } else {
            students = studentRepository.findByClassName(className);
        }

        List<HallTicket> tickets = new ArrayList<>();
        for (Student student : students) {
            if (hallTicketRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())
                    .stream().anyMatch(t -> t.getExamName().equals(examName))) {
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
                    .generatedBy(generatedBy)
                    .build();
            tickets.add(ticket);
        }
        hallTicketRepository.saveAll(tickets);
        return ApiResponse.success("Generated " + tickets.size() + " hall tickets", null);
    }

    public ApiResponse<Void> deleteHallTicket(Long id) {
        if (!hallTicketRepository.existsById(id)) return ApiResponse.error("Hall ticket not found");
        hallTicketRepository.deleteById(id);
        return ApiResponse.success("Hall ticket deleted", null);
    }

    // ============================================================
    // CERTIFICATES
    // ============================================================

    public ApiResponse<List<Certificate>> getAllCertificates(String type) {
        List<Certificate> certs;
        if (type != null && !type.isEmpty()) {
            certs = certificateRepository.findByCertificateTypeOrderByCreatedAtDesc(type);
        } else {
            certs = certificateRepository.findAllByOrderByCreatedAtDesc();
        }
        return ApiResponse.success("Certificates retrieved", certs);
    }

    public ApiResponse<List<Certificate>> getCertificatesByStudent(Long studentId) {
        return ApiResponse.success("Certificates retrieved",
                certificateRepository.findByStudentIdOrderByCreatedAtDesc(studentId));
    }

    public ApiResponse<Certificate> createCertificate(Map<String, Object> body, String generatedBy) {
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
                .generatedBy(generatedBy)
                .build();
        return ApiResponse.success("Certificate generated", certificateRepository.save(cert));
    }

    public ApiResponse<Certificate> verifyCertificate(Long id, String verifiedBy) {
        Optional<Certificate> opt = certificateRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Certificate not found");
        Certificate cert = opt.get();
        cert.setVerifiedBy(verifiedBy);
        cert.setVerifiedAt(java.time.LocalDateTime.now());
        return ApiResponse.success("Certificate verified", certificateRepository.save(cert));
    }

    public ApiResponse<Certificate> findByCertificateId(String certId) {
        return certificateRepository.findByCertificateId(certId)
                .map(c -> ApiResponse.success("Certificate found", c))
                .orElse(ApiResponse.error("Certificate not found"));
    }

    public ApiResponse<Void> deleteCertificate(Long id) {
        if (!certificateRepository.existsById(id)) return ApiResponse.error("Certificate not found");
        certificateRepository.deleteById(id);
        return ApiResponse.success("Certificate deleted", null);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private String generateTicketNumber() {
        String prefix = "HT";
        String timestamp = String.valueOf(System.currentTimeMillis()).substring(5);
        String random = String.format("%04d", new Random().nextInt(9999));
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
        String random = String.format("%06d", new Random().nextInt(999999));
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
}
