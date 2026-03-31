package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class TransportService {

    @Autowired private TransportBusRepository busRepository;
    @Autowired private TransportRouteRepository routeRepository;
    @Autowired private TransportDriverRepository driverRepository;
    @Autowired private TransportStopRepository stopRepository;
    @Autowired private TransportStudentAssignmentRepository assignmentRepository;
    @Autowired private TransportFeeRepository feeRepository;

    // ── Buses ──────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportBus>> getBuses() {
        return ApiResponse.success(busRepository.findAll());
    }

    public ApiResponse<TransportBus> createBus(Map<String, Object> body) {
        String busNo = str(body, "busNo", null);
        if (busNo == null || busNo.isBlank()) return ApiResponse.error("Bus number is required");
        if (busRepository.existsByBusNo(busNo)) return ApiResponse.error("Bus number already exists: " + busNo);

        TransportBus bus = TransportBus.builder()
                .busNo(busNo)
                .capacity(intVal(body, "capacity", 40))
                .currentStudents(intVal(body, "currentStudents", 0))
                .driver(str(body, "driver", null))
                .conductor(str(body, "conductor", null))
                .route(str(body, "route", null))
                .status(str(body, "status", "Active"))
                .build();
        return ApiResponse.success("Bus created", busRepository.save(bus));
    }

    public ApiResponse<TransportBus> updateBus(Long id, Map<String, Object> body) {
        return busRepository.findById(id)
                .map(bus -> {
                    if (body.containsKey("capacity"))        bus.setCapacity(intVal(body, "capacity", bus.getCapacity()));
                    if (body.containsKey("currentStudents")) bus.setCurrentStudents(intVal(body, "currentStudents", bus.getCurrentStudents()));
                    if (body.containsKey("driver"))          bus.setDriver(str(body, "driver", bus.getDriver()));
                    if (body.containsKey("conductor"))       bus.setConductor(str(body, "conductor", bus.getConductor()));
                    if (body.containsKey("route"))           bus.setRoute(str(body, "route", bus.getRoute()));
                    if (body.containsKey("status"))          bus.setStatus(str(body, "status", bus.getStatus()));
                    return ApiResponse.success("Bus updated", busRepository.save(bus));
                })
                .orElse(ApiResponse.error("Bus not found"));
    }

    public ApiResponse<String> deleteBus(Long id) {
        if (!busRepository.existsById(id)) return ApiResponse.error("Bus not found");
        busRepository.deleteById(id);
        return ApiResponse.success("Bus deleted", "Deleted");
    }

    // ── Routes ─────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportRoute>> getRoutes() {
        return ApiResponse.success(routeRepository.findAll());
    }

    public ApiResponse<TransportRoute> createRoute(Map<String, Object> body) {
        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Route name is required");

        TransportRoute route = TransportRoute.builder()
                .name(name)
                .area(str(body, "area", null))
                .stops(intVal(body, "stops", 0))
                .distance(str(body, "distance", null))
                .pickupTime(str(body, "pickupTime", null))
                .dropTime(str(body, "dropTime", null))
                .buses(intVal(body, "buses", 0))
                .build();
        return ApiResponse.success("Route created", routeRepository.save(route));
    }

    public ApiResponse<TransportRoute> updateRoute(Long id, Map<String, Object> body) {
        return routeRepository.findById(id)
                .map(route -> {
                    if (body.containsKey("name"))    route.setName(str(body, "name", route.getName()));
                    if (body.containsKey("area"))       route.setArea(str(body, "area", route.getArea()));
                    if (body.containsKey("stops"))      route.setStops(intVal(body, "stops", route.getStops()));
                    if (body.containsKey("distance"))   route.setDistance(str(body, "distance", route.getDistance()));
                    if (body.containsKey("pickupTime")) route.setPickupTime(str(body, "pickupTime", route.getPickupTime()));
                    if (body.containsKey("dropTime"))   route.setDropTime(str(body, "dropTime", route.getDropTime()));
                    if (body.containsKey("buses"))      route.setBuses(intVal(body, "buses", route.getBuses()));
                    return ApiResponse.success("Route updated", routeRepository.save(route));
                })
                .orElse(ApiResponse.error("Route not found"));
    }

    public ApiResponse<String> deleteRoute(Long id) {
        if (!routeRepository.existsById(id)) return ApiResponse.error("Route not found");
        routeRepository.deleteById(id);
        return ApiResponse.success("Route deleted", "Deleted");
    }

    // ── Drivers ────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportDriver>> getDrivers() {
        return ApiResponse.success(driverRepository.findAll());
    }

    public ApiResponse<TransportDriver> createDriver(Map<String, Object> body) {
        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Driver name is required");

        TransportDriver driver = TransportDriver.builder()
                .name(name)
                .license(str(body, "license", null))
                .mobile(str(body, "mobile", null))
                .bus(str(body, "bus", null))
                .experience(str(body, "experience", null))
                .status(str(body, "status", "Active"))
                .build();
        return ApiResponse.success("Driver created", driverRepository.save(driver));
    }

    public ApiResponse<TransportDriver> updateDriver(Long id, Map<String, Object> body) {
        return driverRepository.findById(id)
                .map(driver -> {
                    if (body.containsKey("name"))       driver.setName(str(body, "name", driver.getName()));
                    if (body.containsKey("license"))    driver.setLicense(str(body, "license", driver.getLicense()));
                    if (body.containsKey("mobile"))     driver.setMobile(str(body, "mobile", driver.getMobile()));
                    if (body.containsKey("bus"))        driver.setBus(str(body, "bus", driver.getBus()));
                    if (body.containsKey("experience")) driver.setExperience(str(body, "experience", driver.getExperience()));
                    if (body.containsKey("status"))     driver.setStatus(str(body, "status", driver.getStatus()));
                    return ApiResponse.success("Driver updated", driverRepository.save(driver));
                })
                .orElse(ApiResponse.error("Driver not found"));
    }

    public ApiResponse<String> deleteDriver(Long id) {
        if (!driverRepository.existsById(id)) return ApiResponse.error("Driver not found");
        driverRepository.deleteById(id);
        return ApiResponse.success("Driver deleted", "Deleted");
    }

    // ── Stops ──────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportStop>> getStops() {
        return ApiResponse.success(stopRepository.findAll());
    }

    public ApiResponse<TransportStop> createStop(Map<String, Object> body) {
        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Stop name is required");

        TransportStop stop = TransportStop.builder()
                .routeId(longVal(body, "routeId", null))
                .routeName(str(body, "routeName", null))
                .name(name)
                .timing(str(body, "timing", null))
                .stopOrder(intVal(body, "stopOrder", 0))
                .build();
        return ApiResponse.success("Stop created", stopRepository.save(stop));
    }

    public ApiResponse<TransportStop> updateStop(Long id, Map<String, Object> body) {
        return stopRepository.findById(id)
                .map(stop -> {
                    if (body.containsKey("name"))      stop.setName(str(body, "name", stop.getName()));
                    if (body.containsKey("timing"))    stop.setTiming(str(body, "timing", stop.getTiming()));
                    if (body.containsKey("stopOrder")) stop.setStopOrder(intVal(body, "stopOrder", stop.getStopOrder()));
                    return ApiResponse.success("Stop updated", stopRepository.save(stop));
                })
                .orElse(ApiResponse.error("Stop not found"));
    }

    public ApiResponse<String> deleteStop(Long id) {
        if (!stopRepository.existsById(id)) return ApiResponse.error("Stop not found");
        stopRepository.deleteById(id);
        return ApiResponse.success("Stop deleted", "Deleted");
    }

    // ── Student Assignments ────────────────────────────────────────────────────

    public ApiResponse<List<TransportStudentAssignment>> getStudentAssignments() {
        return ApiResponse.success(assignmentRepository.findAll());
    }

    public ApiResponse<TransportStudentAssignment> assignStudent(Map<String, Object> body) {
        Long studentId = longVal(body, "studentId", null);
        if (studentId == null) return ApiResponse.error("Student ID is required");

        TransportStudentAssignment assignment = assignmentRepository.findByStudentId(studentId)
                .orElse(TransportStudentAssignment.builder().studentId(studentId).build());

        assignment.setStudentName(str(body, "studentName", assignment.getStudentName()));
        assignment.setBusId(longVal(body, "busId", assignment.getBusId()));
        assignment.setBusNo(str(body, "busNo", assignment.getBusNo()));
        assignment.setRouteId(longVal(body, "routeId", assignment.getRouteId()));
        assignment.setRouteName(str(body, "routeName", assignment.getRouteName()));
        assignment.setStopId(longVal(body, "stopId", assignment.getStopId()));
        assignment.setStopName(str(body, "stopName", assignment.getStopName()));

        return ApiResponse.success("Student assigned to transport", assignmentRepository.save(assignment));
    }

    public ApiResponse<TransportStudentAssignment> updateStudentAssignment(Long id, Map<String, Object> body) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    if (body.containsKey("busId"))     a.setBusId(longVal(body, "busId", a.getBusId()));
                    if (body.containsKey("busNo"))     a.setBusNo(str(body, "busNo", a.getBusNo()));
                    if (body.containsKey("routeId"))   a.setRouteId(longVal(body, "routeId", a.getRouteId()));
                    if (body.containsKey("routeName")) a.setRouteName(str(body, "routeName", a.getRouteName()));
                    if (body.containsKey("stopId"))    a.setStopId(longVal(body, "stopId", a.getStopId()));
                    if (body.containsKey("stopName"))  a.setStopName(str(body, "stopName", a.getStopName()));
                    if (body.containsKey("feePaid"))   a.setFeePaid(Boolean.TRUE.equals(body.get("feePaid")));
                    return ApiResponse.success("Assignment updated", assignmentRepository.save(a));
                })
                .orElse(ApiResponse.error("Assignment not found"));
    }

    public ApiResponse<String> removeStudentAssignment(Long id) {
        if (!assignmentRepository.existsById(id)) return ApiResponse.error("Assignment not found");
        assignmentRepository.deleteById(id);
        return ApiResponse.success("Assignment removed", "Deleted");
    }

    // ── Transport Fees ─────────────────────────────────────────────────────────

    public ApiResponse<List<TransportFee>> getTransportFees() {
        return ApiResponse.success(feeRepository.findAll());
    }

    public ApiResponse<TransportFee> createTransportFee(Map<String, Object> body) {
        Long studentId = longVal(body, "studentId", null);
        if (studentId == null) return ApiResponse.error("Student ID is required");

        TransportFee fee = TransportFee.builder()
                .studentId(studentId)
                .studentName(str(body, "studentName", null))
                .busNo(str(body, "busNo", null))
                .route(str(body, "route", null))
                .month(str(body, "month", null))
                .amount(body.get("amount") != null ? new java.math.BigDecimal(body.get("amount").toString()) : null)
                .status(TransportFee.Status.PENDING)
                .build();
        return ApiResponse.success("Transport fee created", feeRepository.save(fee));
    }

    public ApiResponse<TransportFee> updateTransportFee(Long id, Map<String, Object> body) {
        return feeRepository.findById(id)
                .map(fee -> {
                    if (body.containsKey("amount")) {
                        Object amountObj = body.get("amount");
                        if (amountObj == null) {
                            return ApiResponse.<TransportFee>error("amount is required.");
                        }
                        try {
                            fee.setAmount(new java.math.BigDecimal(amountObj.toString()));
                        } catch (NumberFormatException e) {
                            return ApiResponse.<TransportFee>error("Invalid amount format.");
                        }
                    }
                    if (body.containsKey("status")) {
                        try {
                            fee.setStatus(TransportFee.Status.valueOf(str(body, "status", "PENDING")));
                        } catch (IllegalArgumentException e) {
                            return ApiResponse.<TransportFee>error("Invalid status value.");
                        }
                    }
                    return ApiResponse.success("Transport fee updated", feeRepository.save(fee));
                })
                .orElse(ApiResponse.error("Transport fee not found"));
    }

    public ApiResponse<TransportFee> markTransportFeePaid(Long id) {
        return feeRepository.findById(id)
                .map(fee -> {
                    fee.setStatus(TransportFee.Status.PAID);
                    fee.setPaidDate(LocalDate.now());
                    return ApiResponse.success("Fee marked as paid", feeRepository.save(fee));
                })
                .orElse(ApiResponse.error("Transport fee not found"));
    }

    public ApiResponse<String> deleteTransportFee(Long id) {
        if (!feeRepository.existsById(id)) return ApiResponse.error("Transport fee not found");
        feeRepository.deleteById(id);
        return ApiResponse.success("Transport fee deleted", "Deleted");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Integer intVal(Map<String, Object> map, String key, Integer fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return fallback; }
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }
}
