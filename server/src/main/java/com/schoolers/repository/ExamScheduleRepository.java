package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.ExamSchedule;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ExamScheduleRepository extends BigQueryBaseRepository {

    private ExamSchedule map(com.google.cloud.bigquery.FieldValueList row) {
        ExamSchedule es = new ExamSchedule();
        es.setId(longVal(row, "id"));
        es.setExamName(str(row, "exam_name"));
        es.setExamType(str(row, "exam_type"));
        es.setClassName(str(row, "class_name"));
        es.setSection(str(row, "section"));
        es.setSubject(str(row, "subject"));
        es.setExamDate(dateVal(row, "exam_date"));
        es.setStartTime(str(row, "start_time"));
        es.setEndTime(str(row, "end_time"));
        es.setHallNumber(str(row, "hall_number"));
        es.setMaxMarks(intVal(row, "max_marks"));
        es.setStatus(str(row, "status"));
        es.setInstructions(str(row, "instructions"));
        es.setCreatedAt(datetimeVal(row, "created_at"));
        es.setUpdatedAt(datetimeVal(row, "updated_at"));
        return es;
    }

    public ExamSchedule save(ExamSchedule es) {
        if (es.getId() == null) {
            es.setId(generateNextId("exam_schedules"));
            es.setCreatedAt(now());
            es.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("exam_schedules") +
                    " (id,exam_name,exam_type,class_name,section,subject,exam_date,start_time,end_time," +
                    "hall_number,max_marks,status,instructions,created_at,updated_at)" +
                    " VALUES (@id,@ename,@etype,@cname,@section,@subj,@edate,@stime,@etime,@hall,@mmarks,@status,@instr,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(es.getId()))
                    .addNamedParameter("ename", strParam(es.getExamName()))
                    .addNamedParameter("etype", strParam(es.getExamType()))
                    .addNamedParameter("cname", strParam(es.getClassName()))
                    .addNamedParameter("section", strParam(es.getSection()))
                    .addNamedParameter("subj", strParam(es.getSubject()))
                    .addNamedParameter("edate", dateParam(es.getExamDate()))
                    .addNamedParameter("stime", strParam(es.getStartTime()))
                    .addNamedParameter("etime", strParam(es.getEndTime()))
                    .addNamedParameter("hall", strParam(es.getHallNumber()))
                    .addNamedParameter("mmarks", int64Param(es.getMaxMarks()))
                    .addNamedParameter("status", strParam(es.getStatus()))
                    .addNamedParameter("instr", strParam(es.getInstructions()))
                    .addNamedParameter("ca", datetimeParam(es.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(es.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            es.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("exam_schedules") +
                    " SET exam_name=@ename,exam_type=@etype,class_name=@cname,section=@section,subject=@subj," +
                    "exam_date=@edate,start_time=@stime,end_time=@etime,hall_number=@hall,max_marks=@mmarks," +
                    "status=@status,instructions=@instr,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("ename", strParam(es.getExamName()))
                    .addNamedParameter("etype", strParam(es.getExamType()))
                    .addNamedParameter("cname", strParam(es.getClassName()))
                    .addNamedParameter("section", strParam(es.getSection()))
                    .addNamedParameter("subj", strParam(es.getSubject()))
                    .addNamedParameter("edate", dateParam(es.getExamDate()))
                    .addNamedParameter("stime", strParam(es.getStartTime()))
                    .addNamedParameter("etime", strParam(es.getEndTime()))
                    .addNamedParameter("hall", strParam(es.getHallNumber()))
                    .addNamedParameter("mmarks", int64Param(es.getMaxMarks()))
                    .addNamedParameter("status", strParam(es.getStatus()))
                    .addNamedParameter("instr", strParam(es.getInstructions()))
                    .addNamedParameter("ua", datetimeParam(es.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(es.getId()))
                    .build();
            executeQuery(q);
        }
        return es;
    }

    public Optional<ExamSchedule> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("exam_schedules") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<ExamSchedule> findAll() {
        String sql = "SELECT * FROM " + tableRef("exam_schedules");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<ExamSchedule> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("exam_schedules") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<ExamSchedule> findByClassNameAndSectionOrderByExamDateAsc(String className, String section) {
        String sql = "SELECT * FROM " + tableRef("exam_schedules") +
                " WHERE class_name=@cname AND section=@section ORDER BY exam_date ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cname", strParam(className))
                .addNamedParameter("section", strParam(section))
                .build();
        TableResult result = executeQuery(q);
        List<ExamSchedule> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<ExamSchedule> findByClassNameOrderByExamDateAsc(String className) {
        String sql = "SELECT * FROM " + tableRef("exam_schedules") +
                " WHERE class_name=@cname ORDER BY exam_date ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cname", strParam(className))
                .build();
        TableResult result = executeQuery(q);
        List<ExamSchedule> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<ExamSchedule> findByExamTypeOrderByExamDateAsc(String examType) {
        String sql = "SELECT * FROM " + tableRef("exam_schedules") +
                " WHERE exam_type=@etype ORDER BY exam_date ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("etype", strParam(examType))
                .build();
        TableResult result = executeQuery(q);
        List<ExamSchedule> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<ExamSchedule> findByStatusOrderByExamDateAsc(String status) {
        String sql = "SELECT * FROM " + tableRef("exam_schedules") +
                " WHERE status=@status ORDER BY exam_date ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("status", strParam(status))
                .build();
        TableResult result = executeQuery(q);
        List<ExamSchedule> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<ExamSchedule> findAllByOrderByExamDateAsc() {
        String sql = "SELECT * FROM " + tableRef("exam_schedules") + " ORDER BY exam_date ASC";
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<ExamSchedule> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("exam_schedules") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }
}
