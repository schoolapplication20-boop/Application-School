package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.TransportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transport")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class TransportController {

    @Autowired
    private TransportService transportService;

    @Autowired
    private UserRepository userRepository;

    private Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId)
                .orElse(null);
    }

    // Buses
    @GetMapping("/buses")
    public ResponseEntity<ApiResponse<List<TransportBus>>> getBuses(Authentication auth) {
        return ResponseEntity.ok(transportService.getBuses(getCurrentSchoolId(auth)));
    }

    @PostMapping("/buses")
    public ResponseEntity<?> createBus(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.createBus(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/buses/{id}")
    public ResponseEntity<?> updateBus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateBus(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/buses/{id}")
    public ResponseEntity<?> deleteBus(@PathVariable Long id) {
        var response = transportService.deleteBus(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Routes
    @GetMapping("/routes")
    public ResponseEntity<ApiResponse<List<TransportRoute>>> getRoutes(Authentication auth) {
        return ResponseEntity.ok(transportService.getRoutes(getCurrentSchoolId(auth)));
    }

    @PostMapping("/routes")
    public ResponseEntity<?> createRoute(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.createRoute(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<?> updateRoute(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.updateRoute(id, body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/routes/{id}")
    public ResponseEntity<?> deleteRoute(@PathVariable Long id) {
        var response = transportService.deleteRoute(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Drivers
    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<List<TransportDriver>>> getDrivers(Authentication auth) {
        return ResponseEntity.ok(transportService.getDrivers(getCurrentSchoolId(auth)));
    }

    @PostMapping("/drivers")
    public ResponseEntity<?> createDriver(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.createDriver(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/drivers/{id}")
    public ResponseEntity<?> updateDriver(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateDriver(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/drivers/{id}")
    public ResponseEntity<?> deleteDriver(@PathVariable Long id) {
        var response = transportService.deleteDriver(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Stops
    @GetMapping("/stops")
    public ResponseEntity<ApiResponse<List<TransportStop>>> getStops(Authentication auth) {
        return ResponseEntity.ok(transportService.getStops(getCurrentSchoolId(auth)));
    }

    @PostMapping("/stops")
    public ResponseEntity<?> createStop(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.createStop(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/stops/{id}")
    public ResponseEntity<?> updateStop(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateStop(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/stops/{id}")
    public ResponseEntity<?> deleteStop(@PathVariable Long id) {
        var response = transportService.deleteStop(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Student Assignments
    @GetMapping("/students")
    public ResponseEntity<ApiResponse<List<TransportStudentAssignment>>> getStudentAssignments(Authentication auth) {
        return ResponseEntity.ok(transportService.getStudentAssignments(getCurrentSchoolId(auth)));
    }

    @PostMapping("/students")
    public ResponseEntity<?> assignStudent(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.assignStudent(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<?> updateStudentAssignment(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.updateStudentAssignment(id, body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<?> removeStudentAssignment(@PathVariable Long id) {
        var response = transportService.removeStudentAssignment(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Transport Fees
    @GetMapping("/fees")
    public ResponseEntity<ApiResponse<List<TransportFee>>> getTransportFees(Authentication auth) {
        return ResponseEntity.ok(transportService.getTransportFees(getCurrentSchoolId(auth)));
    }

    @PostMapping("/fees")
    public ResponseEntity<?> createTransportFee(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.createTransportFee(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/fees/{id}")
    public ResponseEntity<?> updateTransportFee(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateTransportFee(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PatchMapping("/fees/{id}/pay")
    public ResponseEntity<?> markFeePaid(@PathVariable Long id) {
        var response = transportService.markTransportFeePaid(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/fees/{id}")
    public ResponseEntity<?> deleteTransportFee(@PathVariable Long id) {
        var response = transportService.deleteTransportFee(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Student Transport Details
    @GetMapping("/student-transport")
    public ResponseEntity<ApiResponse<List<StudentTransport>>> getStudentTransports(Authentication auth) {
        return ResponseEntity.ok(transportService.getStudentTransports(getCurrentSchoolId(auth)));
    }

    @GetMapping("/student-transport/{id}")
    public ResponseEntity<?> getStudentTransportById(@PathVariable Long id) {
        var response = transportService.getStudentTransportById(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @PostMapping("/student-transport")
    public ResponseEntity<?> createStudentTransport(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = transportService.createStudentTransport(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/student-transport/{id}")
    public ResponseEntity<?> updateStudentTransport(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateStudentTransport(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/student-transport/{id}")
    public ResponseEntity<?> deleteStudentTransport(@PathVariable Long id) {
        var response = transportService.deleteStudentTransport(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
