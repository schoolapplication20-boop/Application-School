package com.schoolers.repository;

import com.schoolers.model.SchoolFeature;
import com.schoolers.model.SchoolFeatureId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SchoolFeatureRepository extends JpaRepository<SchoolFeature, SchoolFeatureId> {
    List<SchoolFeature> findByIdSchoolId(Long schoolId);
}
