package com.schoolers.repository;

import com.schoolers.model.ClassRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassRoomRepository extends JpaRepository<ClassRoom, Long> {
    List<ClassRoom> findByTeacherId(Long teacherId);
    Optional<ClassRoom> findByNameAndSection(String name, String section);
    Optional<ClassRoom> findByNameIgnoreCaseAndSectionIgnoreCase(String name, String section);
    boolean existsByNameIgnoreCaseAndSectionIgnoreCase(String name, String section);
    List<ClassRoom> findByIsActive(Boolean isActive);
}
