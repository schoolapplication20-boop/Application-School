package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    @Autowired private StudentTransportRepository studentTransportRepository;

    // ── Buses ──────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportBus>> getBuses(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(busRepository.findBySchoolIdOrderByBusNoAsc(schoolId));
        return ApiResponse.success(busRepository.findAll());
    }

    public ApiResponse<TransportBus> createBus(Map<String, Object> body, Long schoolId) {
        String busNo = str(body, "busNo", null);
        if (busNo == null || busNo.isBlank()) return ApiResponse.error("Bus number is required");
        // School-scoped uniqueness check
        if (schoolId != null && busRepository.existsByBusNoAndSchoolId(busNo, schoolId))
            return ApiResponse.error("Bus number already exists: " + busNo);
        else if (schoolId == null && busRepository.existsByBusNo(busNo))
            return ApiResponse.error("Bus number already exists: " + busNo);

        TransportBus bus = TransportBus.builder()
                .busNo(busNo)
                .model(str(body, "model", null))
                .year(str(body, "year", null))
                .capacity(intVal(body, "capacity", 40))
                .currentStudents(intVal(body, "currentStudents", 0))
                .driver(str(body, "driver", null))
                .conductor(str(body, "conductor", null))
                .route(str(body, "route", null))
                .status(str(body, "status", "Active"))
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Bus created", busRepository.save(bus));
    }

    public ApiResponse<TransportBus> updateBus(Long id, Map<String, Object> body) {
        return busRepository.findById(id)
                .map(bus -> {
                    if (body.containsKey("model"))           bus.setModel(str(body, "model", bus.getModel()));
                    if (body.containsKey("year"))            bus.setYear(str(body, "year", bus.getYear()));
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

    @Transactional
    public ApiResponse<String> deleteBus(Long id) {
        if (!busRepository.existsById(id)) return ApiResponse.error("Bus not found");
        assignmentRepository.deleteByBusId(id);
        busRepository.deleteById(id);
        return ApiResponse.success("Bus deleted", "Deleted");
    }

    // ── Routes ─────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportRoute>> getRoutes(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(routeRepository.findBySchoolIdOrderByNameAsc(schoolId));
        return ApiResponse.success(routeRepository.findAll());
    }

    public ApiResponse<TransportRoute> createRoute(Map<String, Object> body, Long schoolId) {
        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Route name is required");

        TransportRoute route = TransportRoute.builder()
                .name(name)
                .routeNumber(str(body, "routeNumber", null))
                .area(str(body, "area", null))
                .stops(intVal(body, "stops", 0))
                .distance(str(body, "distance", null))
                .pickupTime(str(body, "pickupTime", null))
                .dropTime(str(body, "dropTime", null))
                .buses(intVal(body, "buses", 0))
                .busId(longVal(body, "busId", null))
                .busNo(str(body, "busNo", null))
                .driverId(longVal(body, "driverId", null))
                .driverName(str(body, "driverName", null))
                .capacity(intVal(body, "capacity", 0))
                .status(str(body, "status", "Active"))
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Route created", routeRepository.save(route));
    }

    public ApiResponse<TransportRoute> updateRoute(Long id, Map<String, Object> body, Long schoolId) {
        var opt = routeRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Route not found");
        TransportRoute route = opt.get();
        if (schoolId != null && route.getSchoolId() != null && !schoolId.equals(route.getSchoolId()))
            return ApiResponse.error("Access denied");

        if (body.containsKey("name"))         route.setName(str(body, "name", route.getName()));
        if (body.containsKey("routeNumber"))  route.setRouteNumber(str(body, "routeNumber", route.getRouteNumber()));
        if (body.containsKey("area"))         route.setArea(str(body, "area", route.getArea()));
        if (body.containsKey("stops"))        route.setStops(intVal(body, "stops", route.getStops()));
        if (body.containsKey("distance"))     route.setDistance(str(body, "distance", route.getDistance()));
        if (body.containsKey("pickupTime"))   route.setPickupTime(str(body, "pickupTime", route.getPickupTime()));
        if (body.containsKey("dropTime"))     route.setDropTime(str(body, "dropTime", route.getDropTime()));
        if (body.containsKey("buses"))        route.setBuses(intVal(body, "buses", route.getBuses()));
        if (body.containsKey("busId"))        route.setBusId(longVal(body, "busId", route.getBusId()));
        if (body.containsKey("busNo"))        route.setBusNo(str(body, "busNo", route.getBusNo()));
        if (body.containsKey("driverId"))     route.setDriverId(longVal(body, "driverId", route.getDriverId()));
        if (body.containsKey("driverName"))   route.setDriverName(str(body, "driverName", route.getDriverName()));
        if (body.containsKey("capacity"))     route.setCapacity(intVal(body, "capacity", route.getCapacity()));
        if (body.containsKey("status"))       route.setStatus(str(body, "status", route.getStatus()));
        return ApiResponse.success("Route updated", routeRepository.save(route));
    }

    @Transactional
    public ApiResponse<String> deleteRoute(Long id) {
        if (!routeRepository.existsById(id)) return ApiResponse.error("Route not found");
        stopRepository.deleteByRouteId(id);
        assignmentRepository.deleteByRouteId(id);
        routeRepository.deleteById(id);
        return ApiResponse.success("Route deleted", "Deleted");
    }

    // ── Drivers ────────────────────────────────────────────────────────────────

    public ApiResponse<List<TransportDriver>> getDrivers(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(driverRepository.findBySchoolIdOrderByNameAsc(schoolId));
        return ApiResponse.success(driverRepository.findAll());
    }

    public ApiResponse<TransportDriver> createDriver(Map<String, Object> body, Long schoolId) {
        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Driver name is required");

        TransportDriver driver = TransportDriver.builder()
                .name(name)
                .license(str(body, "license", null))
                .mobile(str(body, "mobile", null))
                .bus(str(body, "bus", null))
                .experience(str(body, "experience", null))
                .status(str(body, "status", "Active"))
                .schoolId(schoolId)
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

    public ApiResponse<List<TransportStop>> getStops(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(stopRepository.findBySchoolIdOrderByStopOrderAsc(schoolId));
        return ApiResponse.success(stopRepository.findAll());
    }

    public ApiResponse<TransportStop> createStop(Map<String, Object> body, Long schoolId) {
        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Stop name is required");

        TransportStop stop = TransportStop.builder()
                .routeId(longVal(body, "routeId", null))
                .routeName(str(body, "routeName", null))
                .name(name)
                .timing(str(body, "timing", null))
                .stopOrder(intVal(body, "stopOrder", 0))
                .schoolId(schoolId)
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

    @Transactional
    public ApiResponse<String> deleteStop(Long id) {
        if (!stopRepository.existsById(id)) return ApiResponse.error("Stop not found");
        assignmentRepository.deleteByStopId(id);
        stopRepository.deleteById(id);
        return ApiResponse.success("Stop deleted", "Deleted");
    }

    // ── Student Assignments ────────────────────────────────────────────────────

    public ApiResponse<List<TransportStudentAssignment>> getStudentAssignments(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(assignmentRepository.findBySchoolIdOrderByStudentNameAsc(schoolId));
        return ApiResponse.success(assignmentRepository.findAll());
    }

    @Transactional
    public ApiResponse<TransportStudentAssignment> assignStudent(Map<String, Object> body, Long schoolId) {
        Long studentId = longVal(body, "studentId", null);
        if (studentId == null) return ApiResponse.error("Student ID is required");

        boolean isNew = (schoolId != null)
                ? !assignmentRepository.findByStudentIdAndSchoolId(studentId, schoolId).isPresent()
                : !assignmentRepository.findByStudentId(studentId).isPresent();

        TransportStudentAssignment assignment = (schoolId != null)
                ? assignmentRepository.findByStudentIdAndSchoolId(studentId, schoolId)
                    .orElse(TransportStudentAssignment.builder().studentId(studentId).schoolId(schoolId).build())
                : assignmentRepository.findByStudentId(studentId)
                    .orElse(TransportStudentAssignment.builder().studentId(studentId).build());

        Long newBusId = longVal(body, "busId", null);
        Long oldBusId = assignment.getBusId();
        boolean busChanged = newBusId != null && !newBusId.equals(oldBusId);

        // Capacity check: only when assigning to a (new) bus
        if (newBusId != null && (isNew || busChanged)) {
            TransportBus bus = busRepository.findById(newBusId).orElse(null);
            if (bus != null) {
                int cap = bus.getCapacity() != null ? bus.getCapacity() : 0;
                int cur = bus.getCurrentStudents() != null ? bus.getCurrentStudents() : 0;
                if (cur >= cap) return ApiResponse.error("Transport capacity reached. Cannot assign student.");
            }
        }

        assignment.setStudentName(str(body, "studentName", assignment.getStudentName()));
        if (body.containsKey("studentClass"))   assignment.setStudentClass(str(body, "studentClass", assignment.getStudentClass()));
        if (body.containsKey("studentSection")) assignment.setStudentSection(str(body, "studentSection", assignment.getStudentSection()));
        assignment.setRouteId(longVal(body, "routeId", assignment.getRouteId()));
        assignment.setRouteName(str(body, "routeName", assignment.getRouteName()));
        assignment.setStopId(longVal(body, "stopId", assignment.getStopId()));
        assignment.setStopName(str(body, "stopName", assignment.getStopName()));
        if (body.containsKey("pickupLocation")) assignment.setPickupLocation(str(body, "pickupLocation", assignment.getPickupLocation()));
        if (body.containsKey("dropLocation"))   assignment.setDropLocation(str(body, "dropLocation", assignment.getDropLocation()));

        // Update bus counts when bus changes
        if (newBusId != null) {
            if (isNew || busChanged) {
                // Increment new bus count
                busRepository.findById(newBusId).ifPresent(b -> {
                    b.setCurrentStudents((b.getCurrentStudents() != null ? b.getCurrentStudents() : 0) + 1);
                    busRepository.save(b);
                });
            }
            if (busChanged && oldBusId != null) {
                // Decrement old bus count
                busRepository.findById(oldBusId).ifPresent(b -> {
                    int cur = b.getCurrentStudents() != null ? b.getCurrentStudents() : 0;
                    b.setCurrentStudents(Math.max(0, cur - 1));
                    busRepository.save(b);
                });
            }
            assignment.setBusId(newBusId);
            String newBusNo = str(body, "busNo", null);
            if (newBusNo != null) assignment.setBusNo(newBusNo);
        }

        return ApiResponse.success("Student assigned to transport", assignmentRepository.save(assignment));
    }

    @Transactional
    public ApiResponse<TransportStudentAssignment> updateStudentAssignment(Long id, Map<String, Object> body, Long schoolId) {
        var opt = assignmentRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Assignment not found");
        TransportStudentAssignment a = opt.get();

        if (schoolId != null && a.getSchoolId() != null && !schoolId.equals(a.getSchoolId()))
            return ApiResponse.error("Access denied");

        Long newBusId = body.containsKey("busId") ? longVal(body, "busId", null) : null;
        Long oldBusId = a.getBusId();
        boolean busChanged = newBusId != null && !newBusId.equals(oldBusId);

        if (newBusId != null && busChanged) {
            TransportBus bus = busRepository.findById(newBusId).orElse(null);
            if (bus != null) {
                int cap = bus.getCapacity() != null ? bus.getCapacity() : 0;
                int cur = bus.getCurrentStudents() != null ? bus.getCurrentStudents() : 0;
                if (cur >= cap) return ApiResponse.error("Transport capacity reached. Cannot assign student.");
            }
            // Decrement old bus
            if (oldBusId != null) {
                busRepository.findById(oldBusId).ifPresent(b -> {
                    b.setCurrentStudents(Math.max(0, (b.getCurrentStudents() != null ? b.getCurrentStudents() : 0) - 1));
                    busRepository.save(b);
                });
            }
            // Increment new bus
            busRepository.findById(newBusId).ifPresent(b -> {
                b.setCurrentStudents((b.getCurrentStudents() != null ? b.getCurrentStudents() : 0) + 1);
                busRepository.save(b);
            });
            a.setBusId(newBusId);
        }
        if (body.containsKey("busNo"))           a.setBusNo(str(body, "busNo", a.getBusNo()));
        if (body.containsKey("studentName"))     a.setStudentName(str(body, "studentName", a.getStudentName()));
        if (body.containsKey("studentClass"))    a.setStudentClass(str(body, "studentClass", a.getStudentClass()));
        if (body.containsKey("studentSection"))  a.setStudentSection(str(body, "studentSection", a.getStudentSection()));
        if (body.containsKey("routeId"))         a.setRouteId(longVal(body, "routeId", a.getRouteId()));
        if (body.containsKey("routeName"))       a.setRouteName(str(body, "routeName", a.getRouteName()));
        if (body.containsKey("stopId"))          a.setStopId(longVal(body, "stopId", a.getStopId()));
        if (body.containsKey("stopName"))        a.setStopName(str(body, "stopName", a.getStopName()));
        if (body.containsKey("pickupLocation"))  a.setPickupLocation(str(body, "pickupLocation", a.getPickupLocation()));
        if (body.containsKey("dropLocation"))    a.setDropLocation(str(body, "dropLocation", a.getDropLocation()));
        return ApiResponse.success("Assignment updated", assignmentRepository.save(a));
    }

    @Transactional
    public ApiResponse<String> removeStudentAssignment(Long id) {
        var opt = assignmentRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.error("Assignment not found");
        TransportStudentAssignment a = opt.get();
        // Decrement bus count
        if (a.getBusId() != null) {
            busRepository.findById(a.getBusId()).ifPresent(b -> {
                b.setCurrentStudents(Math.max(0, (b.getCurrentStudents() != null ? b.getCurrentStudents() : 0) - 1));
                busRepository.save(b);
            });
        }
        assignmentRepository.deleteById(id);
        return ApiResponse.success("Assignment removed", "Deleted");
    }

    // ── Transport Fees ─────────────────────────────────────────────────────────

    public ApiResponse<List<TransportFee>> getTransportFees(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(feeRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId));
        return ApiResponse.success(feeRepository.findAll());
    }

    public ApiResponse<TransportFee> createTransportFee(Map<String, Object> body, Long schoolId) {
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
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Transport fee created", feeRepository.save(fee));
    }

    public ApiResponse<TransportFee> updateTransportFee(Long id, Map<String, Object> body) {
        return feeRepository.findById(id)
                .map(fee -> {
                    if (body.containsKey("amount")) {
                        Object amountObj = body.get("amount");
                        if (amountObj == null) return ApiResponse.<TransportFee>error("amount is required.");
                        try { fee.setAmount(new java.math.BigDecimal(amountObj.toString())); }
                        catch (NumberFormatException e) { return ApiResponse.<TransportFee>error("Invalid amount format."); }
                    }
                    if (body.containsKey("status")) {
                        try { fee.setStatus(TransportFee.Status.valueOf(str(body, "status", "PENDING"))); }
                        catch (IllegalArgumentException e) { return ApiResponse.<TransportFee>error("Invalid status value."); }
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

    // ── Student Transport Details ──────────────────────────────────────────────

    public ApiResponse<List<StudentTransport>> getStudentTransports(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(studentTransportRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId));
        return ApiResponse.success(studentTransportRepository.findAll());
    }

    public ApiResponse<StudentTransport> getStudentTransportById(Long id) {
        return studentTransportRepository.findById(id)
                .map(st -> ApiResponse.success(st))
                .orElse(ApiResponse.error("Record not found"));
    }

    public ApiResponse<StudentTransport> createStudentTransport(Map<String, Object> body, Long schoolId) {
        Long studentId = longVal(body, "studentId", null);
        if (studentId == null) return ApiResponse.error("Student ID is required");

        StudentTransport st = StudentTransport.builder()
                .studentId(studentId)
                .studentName(str(body, "studentName", null))
                .studentClass(str(body, "studentClass", null))
                .transportNeeded(Boolean.TRUE.equals(body.get("transportNeeded")))
                .pickupLocation(str(body, "pickupLocation", null))
                .dropLocation(str(body, "dropLocation", null))
                .routeId(longVal(body, "routeId", null))
                .routeName(str(body, "routeName", null))
                .stopId(longVal(body, "stopId", null))
                .stopName(str(body, "stopName", null))
                .pickupTime(str(body, "pickupTime", null))
                .dropTime(str(body, "dropTime", null))
                .fee(body.get("fee") != null ? new BigDecimal(body.get("fee").toString()) : BigDecimal.ZERO)
                .emergencyContact(str(body, "emergencyContact", null))
                .notes(str(body, "notes", null))
                .status(str(body, "status", "Active"))
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Student transport record created", studentTransportRepository.save(st));
    }

    public ApiResponse<StudentTransport> updateStudentTransport(Long id, Map<String, Object> body) {
        return studentTransportRepository.findById(id)
                .map(st -> {
                    if (body.containsKey("studentName"))      st.setStudentName(str(body, "studentName", st.getStudentName()));
                    if (body.containsKey("studentClass"))     st.setStudentClass(str(body, "studentClass", st.getStudentClass()));
                    if (body.containsKey("transportNeeded"))  st.setTransportNeeded(Boolean.TRUE.equals(body.get("transportNeeded")));
                    if (body.containsKey("pickupLocation"))   st.setPickupLocation(str(body, "pickupLocation", st.getPickupLocation()));
                    if (body.containsKey("dropLocation"))     st.setDropLocation(str(body, "dropLocation", st.getDropLocation()));
                    if (body.containsKey("routeId"))          st.setRouteId(longVal(body, "routeId", st.getRouteId()));
                    if (body.containsKey("routeName"))        st.setRouteName(str(body, "routeName", st.getRouteName()));
                    if (body.containsKey("stopId"))           st.setStopId(longVal(body, "stopId", st.getStopId()));
                    if (body.containsKey("stopName"))         st.setStopName(str(body, "stopName", st.getStopName()));
                    if (body.containsKey("pickupTime"))       st.setPickupTime(str(body, "pickupTime", st.getPickupTime()));
                    if (body.containsKey("dropTime"))         st.setDropTime(str(body, "dropTime", st.getDropTime()));
                    if (body.containsKey("fee"))              st.setFee(body.get("fee") != null ? new BigDecimal(body.get("fee").toString()) : st.getFee());
                    if (body.containsKey("emergencyContact")) st.setEmergencyContact(str(body, "emergencyContact", st.getEmergencyContact()));
                    if (body.containsKey("notes"))            st.setNotes(str(body, "notes", st.getNotes()));
                    if (body.containsKey("status"))           st.setStatus(str(body, "status", st.getStatus()));
                    return ApiResponse.success("Student transport updated", studentTransportRepository.save(st));
                })
                .orElse(ApiResponse.error("Record not found"));
    }

    public ApiResponse<String> deleteStudentTransport(Long id) {
        if (!studentTransportRepository.existsById(id)) return ApiResponse.error("Record not found");
        studentTransportRepository.deleteById(id);
        return ApiResponse.success("Student transport record deleted", "Deleted");
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
