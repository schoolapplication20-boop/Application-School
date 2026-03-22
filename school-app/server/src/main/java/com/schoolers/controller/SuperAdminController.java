package com.schoolers.controller;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.User;
import com.schoolers.service.SuperAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SuperAdminController {

    @Autowired
    private SuperAdminService superAdminService;

    @GetMapping("/admins")
    public ResponseEntity<ApiResponse<List<User>>> getAdmins() {
        return ResponseEntity.ok(superAdminService.getAdmins());
    }

    @PostMapping("/admins")
    public ResponseEntity<ApiResponse<AdminCreatedResponse>> createAdmin(
            @RequestBody Map<String, String> body) {

        String name        = body.getOrDefault("name", "").trim();
        String email       = body.getOrDefault("email", "").trim();
        String mobile      = body.getOrDefault("mobile", "").trim();
        String permissions = body.get("permissions");

        if (name.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid email is required"));

        ApiResponse<AdminCreatedResponse> response =
                superAdminService.createAdmin(name, email, mobile.isEmpty() ? null : mobile, permissions);

        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<User>> updateAdmin(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        String  name        = (String)  body.get("name");
        String  mobile      = (String)  body.get("mobile");
        Boolean isActive    = body.get("isActive") instanceof Boolean ? (Boolean) body.get("isActive") : null;
        String  permissions = body.get("permissions") instanceof String ? (String) body.get("permissions") : null;

        ApiResponse<User> response = superAdminService.updateAdmin(id, name, mobile, isActive, permissions);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAdmin(@PathVariable Long id) {
        ApiResponse<String> response = superAdminService.deleteAdmin(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
