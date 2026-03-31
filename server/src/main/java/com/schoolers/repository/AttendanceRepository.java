package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.Attendance;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.*;

@Repository
public class AttendanceRepository extends BigQueryBaseRepository {
    private static final String T = "attendance";
    private String tbl() { return tableRef(T); }

    private Attendance map(FieldValueList r) {
        Attendance a = new Attendance();
        a.setId(longVal(r, "id"));
        a.setStudentId(longVal(r, "student_id"));
        a.setClassId(longVal(r, "class_id"));
        a.setClassName(str(r, "class_name"));
        a.setDate(dateVal(r, "date"));
        String statusStr = str(r, "status");
        a.setStatus(statusStr != null ? Attendance.Status.valueOf(statusStr) : null);
        a.setMarkedBy(longVal(r, "marked_by"));
        a.setCreatedAt(datetimeVal(r, "created_at"));
        return a;
    }

    public Attendance save(Attendance a) {
        if (a.getId() == null) {
            a.setId(generateNextId(T));
            a.setCreatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,student_id,class_id,class_name,date,status,marked_by,created_at) VALUES (@id,@sid,@cid,@cname,@date,@status,@mb,@ca)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(a.getId()))
                .addNamedParameter("sid", int64Param(a.getStudentId()))
                .addNamedParameter("cid", int64Param(a.getClassId()))
                .addNamedParameter("cname", strParam(a.getClassName()))
                .addNamedParameter("date", dateParam(a.getDate()))
                .addNamedParameter("status", strParam(a.getStatus() != null ? a.getStatus().name() : null))
                .addNamedParameter("mb", int64Param(a.getMarkedBy()))
                .addNamedParameter("ca", datetimeParam(a.getCreatedAt()))
                .build());
        } else {
            String sql = "UPDATE " + tbl() + " SET student_id=@sid,class_id=@cid,class_name=@cname,date=@date,status=@status,marked_by=@mb WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(a.getId()))
                .addNamedParameter("sid", int64Param(a.getStudentId()))
                .addNamedParameter("cid", int64Param(a.getClassId()))
                .addNamedParameter("cname", strParam(a.getClassName()))
                .addNamedParameter("date", dateParam(a.getDate()))
                .addNamedParameter("status", strParam(a.getStatus() != null ? a.getStatus().name() : null))
                .addNamedParameter("mb", int64Param(a.getMarkedBy()))
                .build());
        }
        return a;
    }

    public List<Attendance> saveAll(List<Attendance> list) {
        List<Attendance> saved = new ArrayList<>();
        for (Attendance a : list) { saved.add(save(a)); }
        return saved;
    }

    public List<Attendance> findAll() {
        List<Attendance> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public List<Attendance> findByStudentIdAndDateBetween(Long studentId, LocalDate start, LocalDate end) {
        List<Attendance> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid AND date BETWEEN @start AND @end")
            .addNamedParameter("sid", int64Param(studentId))
            .addNamedParameter("start", dateParam(start))
            .addNamedParameter("end", dateParam(end)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Attendance> findByClassIdAndDate(Long classId, LocalDate date) {
        List<Attendance> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE class_id=@cid AND date=@date")
            .addNamedParameter("cid", int64Param(classId))
            .addNamedParameter("date", dateParam(date)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Attendance> findByClassIdAndDateBetween(Long classId, LocalDate start, LocalDate end) {
        List<Attendance> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE class_id=@cid AND date BETWEEN @start AND @end")
            .addNamedParameter("cid", int64Param(classId))
            .addNamedParameter("start", dateParam(start))
            .addNamedParameter("end", dateParam(end)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public Optional<Attendance> findByStudentIdAndClassIdAndDate(Long studentId, Long classId, LocalDate date) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid AND class_id=@cid AND date=@date")
            .addNamedParameter("sid", int64Param(studentId))
            .addNamedParameter("cid", int64Param(classId))
            .addNamedParameter("date", dateParam(date)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public long countPresentByStudentIdAndDateBetween(Long studentId, LocalDate start, LocalDate end) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE student_id=@sid AND status='PRESENT' AND date BETWEEN @start AND @end")
            .addNamedParameter("sid", int64Param(studentId))
            .addNamedParameter("start", dateParam(start))
            .addNamedParameter("end", dateParam(end)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public List<Attendance> findByStudentIdOrderByDateDesc(Long studentId) {
        List<Attendance> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid ORDER BY date DESC")
            .addNamedParameter("sid", int64Param(studentId)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Object[]> countByStatusForClassAndDate(Long classId, LocalDate date) {
        List<Object[]> result = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT status, COUNT(*) as cnt FROM " + tbl() + " WHERE class_id=@cid AND date=@date GROUP BY status")
            .addNamedParameter("cid", int64Param(classId))
            .addNamedParameter("date", dateParam(date)).build())
            .iterateAll().forEach(row -> result.add(new Object[]{str(row, "status"), row.get("cnt").getLongValue()}));
        return result;
    }

    public List<Object[]> countByStatusForClassAndDateRange(Long classId, LocalDate start, LocalDate end) {
        List<Object[]> result = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT status, COUNT(*) as cnt FROM " + tbl() + " WHERE class_id=@cid AND date BETWEEN @start AND @end GROUP BY status")
            .addNamedParameter("cid", int64Param(classId))
            .addNamedParameter("start", dateParam(start))
            .addNamedParameter("end", dateParam(end)).build())
            .iterateAll().forEach(row -> result.add(new Object[]{str(row, "status"), row.get("cnt").getLongValue()}));
        return result;
    }

    public List<LocalDate> findDistinctDatesByClassId(Long classId) {
        List<LocalDate> dates = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT DISTINCT date FROM " + tbl() + " WHERE class_id=@cid ORDER BY date DESC")
            .addNamedParameter("cid", int64Param(classId)).build())
            .iterateAll().forEach(row -> dates.add(dateVal(row, "date")));
        return dates;
    }

    public List<Object[]> countByDateAndStatusForClass(Long classId) {
        List<Object[]> result = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT date, status, COUNT(*) as cnt FROM " + tbl() + " WHERE class_id=@cid GROUP BY date, status ORDER BY date DESC")
            .addNamedParameter("cid", int64Param(classId)).build())
            .iterateAll().forEach(row -> result.add(new Object[]{dateVal(row, "date"), str(row, "status"), row.get("cnt").getLongValue()}));
        return result;
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public void deleteByStudentId(Long studentId) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE student_id=@sid")
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
