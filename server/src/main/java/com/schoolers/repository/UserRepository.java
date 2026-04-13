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
}
