package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Assignment;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class AssignmentRepository extends BigQueryBaseRepository {

    private Assignment map(com.google.cloud.bigquery.FieldValueList row) {
        Assignment a = new Assignment();
        a.setId(longVal(row, "id"));
        a.setTitle(str(row, "title"));
        a.setDescription(str(row, "description"));
        a.setClassId(longVal(row, "class_id"));
        a.setClassName(str(row, "class_name"));
        a.setTeacherId(longVal(row, "teacher_id"));
        a.setTeacherName(str(row, "teacher_name"));
        a.setDueDate(dateVal(row, "due_date"));
        a.setFileUrl(str(row, "file_url"));
        String statusStr = str(row, "status");
        if (statusStr != null) a.setStatus(Assignment.Status.valueOf(statusStr));
        a.setCreatedAt(datetimeVal(row, "created_at"));
        a.setUpdatedAt(datetimeVal(row, "updated_at"));
        return a;
    }

    public Assignment save(Assignment a) {
        if (a.getId() == null) {
            a.setId(generateNextId("assignments"));
            a.setCreatedAt(now());
            a.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("assignments") +
                    " (id,title,description,class_id,class_name,teacher_id,teacher_name,due_date,file_url,status,created_at,updated_at)" +
                    " VALUES (@id,@title,@desc,@cid,@cname,@tid,@tname,@ddate,@furl,@status,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(a.getId()))
                    .addNamedParameter("title", strParam(a.getTitle()))
                    .addNamedParameter("desc", strParam(a.getDescription()))
                    .addNamedParameter("cid", int64Param(a.getClassId()))
                    .addNamedParameter("cname", strParam(a.getClassName()))
                    .addNamedParameter("tid", int64Param(a.getTeacherId()))
                    .addNamedParameter("tname", strParam(a.getTeacherName()))
                    .addNamedParameter("ddate", dateParam(a.getDueDate()))
                    .addNamedParameter("furl", strParam(a.getFileUrl()))
                    .addNamedParameter("status", strParam(a.getStatus() != null ? a.getStatus().name() : null))
                    .addNamedParameter("ca", datetimeParam(a.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(a.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            a.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("assignments") +
                    " SET title=@title,description=@desc,class_id=@cid,class_name=@cname,teacher_id=@tid," +
                    "teacher_name=@tname,due_date=@ddate,file_url=@furl,status=@status,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("title", strParam(a.getTitle()))
                    .addNamedParameter("desc", strParam(a.getDescription()))
                    .addNamedParameter("cid", int64Param(a.getClassId()))
                    .addNamedParameter("cname", strParam(a.getClassName()))
                    .addNamedParameter("tid", int64Param(a.getTeacherId()))
                    .addNamedParameter("tname", strParam(a.getTeacherName()))
                    .addNamedParameter("ddate", dateParam(a.getDueDate()))
                    .addNamedParameter("furl", strParam(a.getFileUrl()))
                    .addNamedParameter("status", strParam(a.getStatus() != null ? a.getStatus().name() : null))
                    .addNamedParameter("ua", datetimeParam(a.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(a.getId()))
                    .build();
            executeQuery(q);
        }
        return a;
    }

    public Optional<Assignment> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("assignments") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Assignment> findAll() {
        String sql = "SELECT * FROM " + tableRef("assignments");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Assignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("assignments") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<Assignment> findByTeacherId(Long teacherId) {
        String sql = "SELECT * FROM " + tableRef("assignments") + " WHERE teacher_id=@tid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId))
                .build();
        TableResult result = executeQuery(q);
        List<Assignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Assignment> findByClassId(Long classId) {
        String sql = "SELECT * FROM " + tableRef("assignments") + " WHERE class_id=@cid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cid", int64Param(classId))
                .build();
        TableResult result = executeQuery(q);
        List<Assignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Assignment> findByClassIdAndStatus(Long classId, Assignment.Status status) {
        String sql = "SELECT * FROM " + tableRef("assignments") + " WHERE class_id=@cid AND status=@status";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cid", int64Param(classId))
                .addNamedParameter("status", strParam(status.name()))
                .build();
        TableResult result = executeQuery(q);
        List<Assignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Assignment> findByTeacherIdAndStatus(Long teacherId, Assignment.Status status) {
        String sql = "SELECT * FROM " + tableRef("assignments") + " WHERE teacher_id=@tid AND status=@status";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId))
                .addNamedParameter("status", strParam(status.name()))
                .build();
        TableResult result = executeQuery(q);
        List<Assignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("assignments") + " WHERE id=@id";
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
        String sql = "DELETE FROM " + tableRef("assignments") + " WHERE teacher_id=@tid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId)).build());
    }
}
