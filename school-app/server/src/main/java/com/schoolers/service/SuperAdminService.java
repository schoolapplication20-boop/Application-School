package com.schoolers.service;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SuperAdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    private static final SecureRandom RANDOM = new SecureRandom();

    public String generatePassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    public ApiResponse<AdminCreatedResponse> createAdmin(String name, String email, String mobile, String permissions) {
        if (userRepository.existsByEmail(email)) {
            return ApiResponse.error("An account with this email already exists.");
        }

        String rawPassword = generatePassword();

        User user = userRepository.save(User.builder()
                .name(name)
                .email(email)
                .mobile(mobile != null && !mobile.isBlank() ? mobile : null)
                .password(passwordEncoder.encode(rawPassword))
                .tempPassword(rawPassword)
                .role(User.Role.ADMIN)
                .isActive(true)
                .firstLogin(true)
                .permissions(permissions)
                .build());

        AdminCreatedResponse response = AdminCreatedResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .generatedPassword(rawPassword)
                .build();

        return ApiResponse.success("Admin created successfully", response);
    }

    public ApiResponse<List<User>> getAdmins() {
        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .collect(Collectors.toList());
        return ApiResponse.success(admins);
    }

    public ApiResponse<User> updateAdmin(Long id, String name, String mobile, Boolean isActive, String permissions) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .map(user -> {
                    if (name != null && !name.isBlank()) user.setName(name);
                    if (mobile != null) user.setMobile(mobile.isBlank() ? null : mobile);
                    if (isActive != null) user.setIsActive(isActive);
                    if (permissions != null) user.setPermissions(permissions);
                    return ApiResponse.success("Admin updated", userRepository.save(user));
                })
                .orElse(ApiResponse.error("Admin not found"));
    }

    public ApiResponse<String> deleteAdmin(Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .map(user -> {
                    userRepository.deleteById(id);
                    return ApiResponse.success("Admin deleted", "Deleted");
                })
                .orElse(ApiResponse.<String>error("Admin not found"));
    }
}
