package com.schoolers.repository;

import com.schoolers.model.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtAsc(Long assignmentId);
    List<AssignmentSubmission> findByStudentIdAndSchoolIdOrderBySubmittedAtDesc(Long studentId, Long schoolId);
    Optional<AssignmentSubmission> findByStudentIdAndAssignmentId(Long studentId, Long assignmentId);
    boolean existsByStudentIdAndAssignmentId(Long studentId, Long assignmentId);
    void deleteByAssignmentId(Long assignmentId);
    long countByAssignmentId(Long assignmentId);
}
