package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Timetable;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TimetableRepository extends BigQueryBaseRepository {

    private Timetable map(com.google.cloud.bigquery.FieldValueList row) {
        Timetable t = new Timetable();
        t.setId(longVal(row, "id"));
        t.setTeacherId(longVal(row, "teacher_id"));
        t.setTeacherName(str(row, "teacher_name"));
        t.setClassSection(str(row, "class_section"));
        t.setSubject(str(row, "subject"));
        t.setDay(str(row, "day"));
        t.setStartTime(str(row, "start_time"));
        t.setEndTime(str(row, "end_time"));
        t.setRoom(str(row, "room"));
        t.setIsActive(boolVal(row, "is_active"));
        t.setCreatedAt(datetimeVal(row, "created_at"));
        t.setUpdatedAt(datetimeVal(row, "updated_at"));
        return t;
    }

    public Timetable save(Timetable t) {
        if (t.getId() == null) {
            t.setId(generateNextId("timetable"));
            t.setCreatedAt(now());
            t.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("timetable") +
                    " (id,teacher_id,teacher_name,class_section,subject,day,start_time,end_time,room,is_active,created_at,updated_at)" +
                    " VALUES (@id,@tid,@tname,@cs,@subj,@day,@stime,@etime,@room,@active,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(t.getId()))
                    .addNamedParameter("tid", int64Param(t.getTeacherId()))
                    .addNamedParameter("tname", strParam(t.getTeacherName()))
                    .addNamedParameter("cs", strParam(t.getClassSection()))
                    .addNamedParameter("subj", strParam(t.getSubject()))
                    .addNamedParameter("day", strParam(t.getDay()))
                    .addNamedParameter("stime", strParam(t.getStartTime()))
                    .addNamedParameter("etime", strParam(t.getEndTime()))
                    .addNamedParameter("room", strParam(t.getRoom()))
                    .addNamedParameter("active", boolParam(t.getIsActive()))
                    .addNamedParameter("ca", datetimeParam(t.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(t.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            t.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("timetable") +
                    " SET teacher_id=@tid,teacher_name=@tname,class_section=@cs,subject=@subj," +
                    "day=@day,start_time=@stime,end_time=@etime,room=@room,is_active=@active,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("tid", int64Param(t.getTeacherId()))
                    .addNamedParameter("tname", strParam(t.getTeacherName()))
                    .addNamedParameter("cs", strParam(t.getClassSection()))
                    .addNamedParameter("subj", strParam(t.getSubject()))
                    .addNamedParameter("day", strParam(t.getDay()))
                    .addNamedParameter("stime", strParam(t.getStartTime()))
                    .addNamedParameter("etime", strParam(t.getEndTime()))
                    .addNamedParameter("room", strParam(t.getRoom()))
                    .addNamedParameter("active", boolParam(t.getIsActive()))
                    .addNamedParameter("ua", datetimeParam(t.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(t.getId()))
                    .build();
            executeQuery(q);
        }
        return t;
    }

    public Optional<Timetable> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("timetable") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Timetable> findAll() {
        String sql = "SELECT * FROM " + tableRef("timetable");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Timetable> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("timetable") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<Timetable> findByTeacherId(Long teacherId) {
        String sql = "SELECT * FROM " + tableRef("timetable") + " WHERE teacher_id=@tid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId))
                .build();
        TableResult result = executeQuery(q);
        List<Timetable> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Timetable> findByClassSection(String classSection) {
        String sql = "SELECT * FROM " + tableRef("timetable") + " WHERE class_section=@cs";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cs", strParam(classSection))
                .build();
        TableResult result = executeQuery(q);
        List<Timetable> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Timetable> findByTeacherIdAndDay(Long teacherId, String day) {
        String sql = "SELECT * FROM " + tableRef("timetable") + " WHERE teacher_id=@tid AND day=@day";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId))
                .addNamedParameter("day", strParam(day))
                .build();
        TableResult result = executeQuery(q);
        List<Timetable> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Timetable> findByIsActiveTrue() {
        String sql = "SELECT * FROM " + tableRef("timetable") + " WHERE is_active=TRUE";
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Timetable> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("timetable") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public void deleteByTeacherId(Long teacherId) {
        String sql = "DELETE FROM " + tableRef("timetable") + " WHERE teacher_id=@tid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId)).build());
    }
}
