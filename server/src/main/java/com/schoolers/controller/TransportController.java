package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.service.TransportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    // Buses
    @GetMapping("/buses")
    public ResponseEntity<ApiResponse<List<TransportBus>>> getBuses() {
        return ResponseEntity.ok(transportService.getBuses());
    }

    @PostMapping("/buses")
    public ResponseEntity<?> createBus(@RequestBody Map<String, Object> body) {
        var response = transportService.createBus(body);
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
    public ResponseEntity<ApiResponse<List<TransportRoute>>> getRoutes() {
        return ResponseEntity.ok(transportService.getRoutes());
    }

    @PostMapping("/routes")
    public ResponseEntity<?> createRoute(@RequestBody Map<String, Object> body) {
        var response = transportService.createRoute(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<?> updateRoute(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateRoute(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/routes/{id}")
    public ResponseEntity<?> deleteRoute(@PathVariable Long id) {
        var response = transportService.deleteRoute(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Drivers
    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<List<TransportDriver>>> getDrivers() {
        return ResponseEntity.ok(transportService.getDrivers());
    }

    @PostMapping("/drivers")
    public ResponseEntity<?> createDriver(@RequestBody Map<String, Object> body) {
        var response = transportService.createDriver(body);
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
    public ResponseEntity<ApiResponse<List<TransportStop>>> getStops() {
        return ResponseEntity.ok(transportService.getStops());
    }

    @PostMapping("/stops")
    public ResponseEntity<?> createStop(@RequestBody Map<String, Object> body) {
        var response = transportService.createStop(body);
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
    public ResponseEntity<ApiResponse<List<TransportStudentAssignment>>> getStudentAssignments() {
        return ResponseEntity.ok(transportService.getStudentAssignments());
    }

    @PostMapping("/students")
    public ResponseEntity<?> assignStudent(@RequestBody Map<String, Object> body) {
        var response = transportService.assignStudent(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<?> updateStudentAssignment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = transportService.updateStudentAssignment(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<?> removeStudentAssignment(@PathVariable Long id) {
        var response = transportService.removeStudentAssignment(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Transport Fees
    @GetMapping("/fees")
    public ResponseEntity<ApiResponse<List<TransportFee>>> getTransportFees() {
        return ResponseEntity.ok(transportService.getTransportFees());
    }

    @PostMapping("/fees")
    public ResponseEntity<?> createTransportFee(@RequestBody Map<String, Object> body) {
        var response = transportService.createTransportFee(body);
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
    public ResponseEntity<ApiResponse<List<com.schoolers.model.StudentTransport>>> getStudentTransports() {
        return ResponseEntity.ok(transportService.getStudentTransports());
    }

    @GetMapping("/student-transport/{id}")
    public ResponseEntity<?> getStudentTransportById(@PathVariable Long id) {
        var response = transportService.getStudentTransportById(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @PostMapping("/student-transport")
    public ResponseEntity<?> createStudentTransport(@RequestBody Map<String, Object> body) {
        var response = transportService.createStudentTransport(body);
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
