package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Homework;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class HomeworkRepository extends BigQueryBaseRepository {

    private Homework map(com.google.cloud.bigquery.FieldValueList row) {
        Homework h = new Homework();
        h.setId(longVal(row, "id"));
        h.setTitle(str(row, "title"));
        h.setDescription(str(row, "description"));
        h.setClassSection(str(row, "class_section"));
        h.setSubject(str(row, "subject"));
        h.setTeacherId(longVal(row, "teacher_id"));
        h.setTeacherName(str(row, "teacher_name"));
        h.setDueDate(dateVal(row, "due_date"));
        String statusStr = str(row, "status");
        if (statusStr != null) h.setStatus(Homework.Status.valueOf(statusStr));
        h.setCreatedAt(datetimeVal(row, "created_at"));
        h.setUpdatedAt(datetimeVal(row, "updated_at"));
        return h;
    }

    public Homework save(Homework h) {
        if (h.getId() == null) {
            h.setId(generateNextId("homework"));
            h.setCreatedAt(now());
            h.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("homework") +
                    " (id,title,description,class_section,subject,teacher_id,teacher_name,due_date,status,created_at,updated_at)" +
                    " VALUES (@id,@title,@desc,@cs,@subj,@tid,@tname,@ddate,@status,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(h.getId()))
                    .addNamedParameter("title", strParam(h.getTitle()))
                    .addNamedParameter("desc", strParam(h.getDescription()))
                    .addNamedParameter("cs", strParam(h.getClassSection()))
                    .addNamedParameter("subj", strParam(h.getSubject()))
                    .addNamedParameter("tid", int64Param(h.getTeacherId()))
                    .addNamedParameter("tname", strParam(h.getTeacherName()))
                    .addNamedParameter("ddate", dateParam(h.getDueDate()))
                    .addNamedParameter("status", strParam(h.getStatus() != null ? h.getStatus().name() : null))
                    .addNamedParameter("ca", datetimeParam(h.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(h.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            h.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("homework") +
                    " SET title=@title,description=@desc,class_section=@cs,subject=@subj," +
                    "teacher_id=@tid,teacher_name=@tname,due_date=@ddate,status=@status,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("title", strParam(h.getTitle()))
                    .addNamedParameter("desc", strParam(h.getDescription()))
                    .addNamedParameter("cs", strParam(h.getClassSection()))
                    .addNamedParameter("subj", strParam(h.getSubject()))
                    .addNamedParameter("tid", int64Param(h.getTeacherId()))
                    .addNamedParameter("tname", strParam(h.getTeacherName()))
                    .addNamedParameter("ddate", dateParam(h.getDueDate()))
                    .addNamedParameter("status", strParam(h.getStatus() != null ? h.getStatus().name() : null))
                    .addNamedParameter("ua", datetimeParam(h.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(h.getId()))
                    .build();
            executeQuery(q);
        }
        return h;
    }

    public Optional<Homework> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("homework") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Homework> findAll() {
        String sql = "SELECT * FROM " + tableRef("homework");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Homework> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("homework") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<Homework> findByTeacherId(Long teacherId) {
        String sql = "SELECT * FROM " + tableRef("homework") + " WHERE teacher_id=@tid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId))
                .build();
        TableResult result = executeQuery(q);
        List<Homework> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Homework> findByClassSection(String classSection) {
        String sql = "SELECT * FROM " + tableRef("homework") + " WHERE class_section=@cs";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cs", strParam(classSection))
                .build();
        TableResult result = executeQuery(q);
        List<Homework> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Homework> findByClassSectionAndSubject(String classSection, String subject) {
        String sql = "SELECT * FROM " + tableRef("homework") + " WHERE class_section=@cs AND subject=@subj";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cs", strParam(classSection))
                .addNamedParameter("subj", strParam(subject))
                .build();
        TableResult result = executeQuery(q);
        List<Homework> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("homework") + " WHERE id=@id";
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
        String sql = "DELETE FROM " + tableRef("homework") + " WHERE teacher_id=@tid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId)).build());
    }
}
