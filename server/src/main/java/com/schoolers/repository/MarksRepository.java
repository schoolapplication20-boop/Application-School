package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Marks;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class MarksRepository extends BigQueryBaseRepository {

    private Marks map(com.google.cloud.bigquery.FieldValueList row) {
        Marks m = new Marks();
        m.setId(longVal(row, "id"));
        m.setStudentId(longVal(row, "student_id"));
        m.setStudentName(str(row, "student_name"));
        m.setSubject(str(row, "subject"));
        m.setExamType(str(row, "exam_type"));
        m.setMarks(intVal(row, "marks"));
        m.setMaxMarks(intVal(row, "max_marks"));
        m.setGrade(str(row, "grade"));
        m.setTeacherId(longVal(row, "teacher_id"));
        m.setExamDate(dateVal(row, "exam_date"));
        m.setCreatedAt(datetimeVal(row, "created_at"));
        m.setUpdatedAt(datetimeVal(row, "updated_at"));
        return m;
    }

    public Marks save(Marks m) {
        if (m.getId() == null) {
            m.setId(generateNextId("marks"));
            m.setCreatedAt(now());
            m.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("marks") +
                    " (id,student_id,student_name,subject,exam_type,marks,max_marks,grade,teacher_id,exam_date,created_at,updated_at)" +
                    " VALUES (@id,@sid,@sname,@subj,@etype,@marks,@mmarks,@grade,@tid,@edate,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(m.getId()))
                    .addNamedParameter("sid", int64Param(m.getStudentId()))
                    .addNamedParameter("sname", strParam(m.getStudentName()))
                    .addNamedParameter("subj", strParam(m.getSubject()))
                    .addNamedParameter("etype", strParam(m.getExamType()))
                    .addNamedParameter("marks", int64Param(m.getMarks()))
                    .addNamedParameter("mmarks", int64Param(m.getMaxMarks()))
                    .addNamedParameter("grade", strParam(m.getGrade()))
                    .addNamedParameter("tid", int64Param(m.getTeacherId()))
                    .addNamedParameter("edate", dateParam(m.getExamDate()))
                    .addNamedParameter("ca", datetimeParam(m.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(m.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            m.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("marks") +
                    " SET student_id=@sid,student_name=@sname,subject=@subj,exam_type=@etype," +
                    "marks=@marks,max_marks=@mmarks,grade=@grade,teacher_id=@tid,exam_date=@edate,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("sid", int64Param(m.getStudentId()))
                    .addNamedParameter("sname", strParam(m.getStudentName()))
                    .addNamedParameter("subj", strParam(m.getSubject()))
                    .addNamedParameter("etype", strParam(m.getExamType()))
                    .addNamedParameter("marks", int64Param(m.getMarks()))
                    .addNamedParameter("mmarks", int64Param(m.getMaxMarks()))
                    .addNamedParameter("grade", strParam(m.getGrade()))
                    .addNamedParameter("tid", int64Param(m.getTeacherId()))
                    .addNamedParameter("edate", dateParam(m.getExamDate()))
                    .addNamedParameter("ua", datetimeParam(m.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(m.getId()))
                    .build();
            executeQuery(q);
        }
        return m;
    }

    public Optional<Marks> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("marks") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Marks> findAll() {
        String sql = "SELECT * FROM " + tableRef("marks");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Marks> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("marks") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<Marks> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM " + tableRef("marks") + " WHERE student_id=@sid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .build();
        TableResult result = executeQuery(q);
        List<Marks> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Marks> findByStudentIdAndSubject(Long studentId, String subject) {
        String sql = "SELECT * FROM " + tableRef("marks") + " WHERE student_id=@sid AND subject=@subj";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .addNamedParameter("subj", strParam(subject))
                .build();
        TableResult result = executeQuery(q);
        List<Marks> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Marks> findByStudentIdAndExamType(Long studentId, String examType) {
        String sql = "SELECT * FROM " + tableRef("marks") + " WHERE student_id=@sid AND exam_type=@etype";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .addNamedParameter("etype", strParam(examType))
                .build();
        TableResult result = executeQuery(q);
        List<Marks> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Marks> findByTeacherId(Long teacherId) {
        String sql = "SELECT * FROM " + tableRef("marks") + " WHERE teacher_id=@tid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId))
                .build();
        TableResult result = executeQuery(q);
        List<Marks> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public Double findAveragePercentageByStudentId(Long studentId) {
        String sql = "SELECT AVG(CAST(marks AS FLOAT64) / max_marks * 100) AS avg_pct FROM " +
                tableRef("marks") + " WHERE student_id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(studentId))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            com.google.cloud.bigquery.FieldValue val = row.get("avg_pct");
            if (val == null || val.isNull()) return null;
            return val.getDoubleValue();
        }
        return null;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("marks") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public void deleteByStudentId(Long studentId) {
        String sql = "DELETE FROM " + tableRef("marks") + " WHERE student_id=@sid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId)).build());
    }

    public void deleteByTeacherId(Long teacherId) {
        String sql = "DELETE FROM " + tableRef("marks") + " WHERE teacher_id=@tid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tid", int64Param(teacherId)).build());
    }
}
