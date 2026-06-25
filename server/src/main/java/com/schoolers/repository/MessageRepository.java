package com.schoolers.repository;

import com.schoolers.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);
    List<Message> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    /** Most recent messages involving this user, capped via Pageable */
    @Query("SELECT m FROM Message m WHERE m.senderId = :uid OR m.receiverId = :uid ORDER BY m.createdAt DESC")
    List<Message> findAllByUserId(@Param("uid") Long userId, Pageable pageable);

    /** Most recent messages involving this user scoped to a school, capped via Pageable */
    @Query("SELECT m FROM Message m WHERE (m.senderId = :uid OR m.receiverId = :uid) AND m.schoolId = :schoolId ORDER BY m.createdAt DESC")
    List<Message> findAllByUserIdAndSchoolId(@Param("uid") Long userId, @Param("schoolId") Long schoolId, Pageable pageable);

    /** Most recent messages of a 1-1 conversation, newest first, capped via Pageable; reverse in service for chronological order */
    @Query("SELECT m FROM Message m WHERE (m.senderId = :u1 AND m.receiverId = :u2) OR (m.senderId = :u2 AND m.receiverId = :u1) ORDER BY m.createdAt DESC")
    List<Message> findConversationDesc(@Param("u1") Long u1, @Param("u2") Long u2, Pageable pageable);

    /** School-scoped 1-1 conversation, newest first, capped via Pageable */
    @Query("SELECT m FROM Message m WHERE ((m.senderId = :u1 AND m.receiverId = :u2) OR (m.senderId = :u2 AND m.receiverId = :u1)) AND m.schoolId = :schoolId ORDER BY m.createdAt DESC")
    List<Message> findConversationDescBySchoolId(@Param("u1") Long u1, @Param("u2") Long u2, @Param("schoolId") Long schoolId, Pageable pageable);

    long countByReceiverIdAndIsReadFalse(Long receiverId);

    /** All broadcast messages visible to a specific student (school-wide, class, or direct), capped via Pageable */
    @Query("SELECT m FROM Message m WHERE m.schoolId = :schoolId " +
           "AND (m.isSchoolWide = true OR m.classSection = :classSection OR m.targetStudentId = :studentId) " +
           "ORDER BY m.createdAt DESC")
    List<Message> findForStudent(
            @Param("schoolId") Long schoolId,
            @Param("classSection") String classSection,
            @Param("studentId") Long studentId,
            Pageable pageable);

    /** All broadcast messages sent for a given school (for admin/teacher views), capped via Pageable */
    @Query("SELECT m FROM Message m WHERE m.schoolId = :schoolId " +
           "AND (m.isSchoolWide = true OR m.classSection IS NOT NULL) " +
           "ORDER BY m.createdAt DESC")
    List<Message> findBroadcastsBySchool(@Param("schoolId") Long schoolId, Pageable pageable);

    @Modifying @Transactional
    void deleteBySenderId(Long senderId);

    @Modifying @Transactional
    void deleteByClassSectionAndSchoolId(String classSection, Long schoolId);

    @Modifying @Transactional
    void deleteByTargetStudentId(Long targetStudentId);

    @Modifying @Transactional
    void deleteByTargetStudentIdIn(List<Long> targetStudentIds);

    @Modifying @Transactional
    void deleteBySchoolId(Long schoolId);

    @Modifying @Transactional
    @Query("DELETE FROM Message m WHERE m.senderId IN (SELECT u.id FROM User u WHERE u.schoolId = :schoolId)")
    void deleteBySenderSchoolId(@Param("schoolId") Long schoolId);
}
