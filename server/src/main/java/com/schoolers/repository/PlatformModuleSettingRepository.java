package com.schoolers.repository;

import com.schoolers.model.PlatformModuleSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformModuleSettingRepository extends JpaRepository<PlatformModuleSetting, String> {
}
