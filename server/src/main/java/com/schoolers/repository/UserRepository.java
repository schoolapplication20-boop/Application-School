package com.schoolers.repository;

import com.schoolers.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByMobile(String mobile);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByMobile(String mobile);
    boolean existsByUsername(String username);
    boolean existsByMobileAndIdNot(String mobile, Long id);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
    List<User> findByRole(User.Role role);
    List<User> findByRoleAndSchoolId(User.Role role, Long schoolId);
    boolean existsBySchoolIdAndRole(Long schoolId, User.Role role);

    /** Find the login account directly linked to a student record */
    Optional<User> findByStudentId(Long studentId);

    /** Find all school-level super admins (schoolId is not null) */
    List<User> findByRoleAndSchoolIdNotNull(User.Role role);

    /** All users belonging to a specific school */
    List<User> findBySchoolId(Long schoolId);

    /** Count all users (any role) belonging to a specific school */
    long countBySchoolId(Long schoolId);

    /** Count active/inactive users for a school */
    long countBySchoolIdAndIsActive(Long schoolId, Boolean isActive);

    /** Count users by school and role */
    long countBySchoolIdAndRole(Long schoolId, User.Role role);

    /** Batch role counts for a school: returns [role, count] pairs — avoids N+1 */
    @org.springframework.data.jpa.repository.Query(
        "SELECT u.role, COUNT(u) FROM User u WHERE u.schoolId = :schoolId GROUP BY u.role")
    java.util.List<Object[]> countByRoleForSchool(@Param("schoolId") Long schoolId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
