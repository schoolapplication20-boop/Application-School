package com.schoolers.service;

import com.schoolers.model.PlatformModuleSetting;
import com.schoolers.repository.PlatformModuleSettingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/** Platform-wide kill switch for an optional module (e.g. "whatsapp"). Opt-out: a missing row means enabled. */
@Service
public class PlatformModuleSettingService {

    private final PlatformModuleSettingRepository repository;

    public PlatformModuleSettingService(PlatformModuleSettingRepository repository) {
        this.repository = repository;
    }

    public boolean isGloballyEnabled(String moduleKey) {
        return repository.findById(moduleKey).map(PlatformModuleSetting::getEnabled).orElse(true);
    }

    public PlatformModuleSetting setGloballyEnabled(String moduleKey, boolean enabled, Long updatedBy) {
        PlatformModuleSetting setting = repository.findById(moduleKey)
                .orElseGet(() -> PlatformModuleSetting.builder().moduleKey(moduleKey).build());
        setting.setEnabled(enabled);
        setting.setUpdatedBy(updatedBy);
        setting.setUpdatedAt(LocalDateTime.now());
        return repository.save(setting);
    }
}
