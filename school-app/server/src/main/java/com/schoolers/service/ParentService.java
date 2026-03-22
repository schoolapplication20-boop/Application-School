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
public class ParentService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private FeeRepository feeRepository;

    @Autowired
    private MarksRepository marksRepository;

    // Child Info
    public ApiResponse<List<Student>> getChildByParentId(Long parentId) {
        List<Student> students = studentRepository.findByParentId(parentId);
        if (students.isEmpty()) {
            return ApiResponse.error("No students found for parent ID: " + parentId);
        }
        return ApiResponse.success(students);
    }

    // Attendance
    public ApiResponse<List<Attendance>> getChildAttendance(Long studentId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusMonths(1);
        if (endDate == null) endDate = LocalDate.now();
        return ApiResponse.success(attendanceRepository.findByStudentIdAndDateBetween(studentId, startDate, endDate));
    }

    // Assignments
    public ApiResponse<List<Assignment>> getChildAssignments(Long studentId) {
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ApiResponse.error("Student not found");
        }
        // Get assignments by class
        return ApiResponse.success(List.of()); // Simplified - would search by class
    }

    // Fees
    public ApiResponse<List<Fee>> getChildFees(Long studentId) {
        return ApiResponse.success(feeRepository.findByStudentId(studentId));
    }

    public ApiResponse<Fee> payFee(Long feeId, String paymentMethod, String transactionId) {
        return feeRepository.findById(feeId)
                .map(fee -> {
                    fee.setStatus(Fee.Status.PAID);
                    fee.setPaidDate(LocalDate.now());
                    fee.setPaymentMethod(paymentMethod);
                    fee.setTransactionId(transactionId);
                    return ApiResponse.success("Fee paid successfully", feeRepository.save(fee));
                })
                .orElse(ApiResponse.error("Fee record not found"));
    }

    // Marks / Performance
    public ApiResponse<List<Marks>> getChildMarks(Long studentId) {
        return ApiResponse.success(marksRepository.findByStudentId(studentId));
    }
}
