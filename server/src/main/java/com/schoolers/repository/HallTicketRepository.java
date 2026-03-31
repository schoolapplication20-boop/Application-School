package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.HallTicket;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class HallTicketRepository extends BigQueryBaseRepository {

    private HallTicket map(com.google.cloud.bigquery.FieldValueList row) {
        HallTicket ht = new HallTicket();
        ht.setId(longVal(row, "id"));
        ht.setTicketNumber(str(row, "ticket_number"));
        ht.setStudentId(longVal(row, "student_id"));
        ht.setStudentName(str(row, "student_name"));
        ht.setRollNumber(str(row, "roll_number"));
        ht.setClassName(str(row, "class_name"));
        ht.setSection(str(row, "section"));
        ht.setExamName(str(row, "exam_name"));
        ht.setExamType(str(row, "exam_type"));
        ht.setExamSubjects(str(row, "exam_subjects"));
        ht.setAcademicYear(str(row, "academic_year"));
        ht.setPhotoUrl(str(row, "photo_url"));
        ht.setDateOfBirth(str(row, "date_of_birth"));
        ht.setGender(str(row, "gender"));
        ht.setRegistrationNumber(str(row, "registration_number"));
        ht.setExamCenter(str(row, "exam_center"));
        ht.setExamCenterAddress(str(row, "exam_center_address"));
        ht.setIsActive(boolVal(row, "is_active"));
        ht.setGeneratedBy(str(row, "generated_by"));
        ht.setCreatedAt(datetimeVal(row, "created_at"));
        ht.setUpdatedAt(datetimeVal(row, "updated_at"));
        return ht;
    }

    public HallTicket save(HallTicket ht) {
        if (ht.getId() == null) {
            ht.setId(generateNextId("hall_tickets"));
            ht.setCreatedAt(now());
            ht.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("hall_tickets") +
                    " (id,ticket_number,student_id,student_name,roll_number,class_name,section,exam_name,exam_type," +
                    "exam_subjects,academic_year,photo_url,date_of_birth,gender,registration_number," +
                    "exam_center,exam_center_address,is_active,generated_by,created_at,updated_at)" +
                    " VALUES (@id,@tnum,@sid,@sname,@roll,@cname,@section,@ename,@etype,@esubj,@ayear," +
                    "@photo,@dob,@gender,@regnum,@ecenter,@ecaddr,@active,@genby,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(ht.getId()))
                    .addNamedParameter("tnum", strParam(ht.getTicketNumber()))
                    .addNamedParameter("sid", int64Param(ht.getStudentId()))
                    .addNamedParameter("sname", strParam(ht.getStudentName()))
                    .addNamedParameter("roll", strParam(ht.getRollNumber()))
                    .addNamedParameter("cname", strParam(ht.getClassName()))
                    .addNamedParameter("section", strParam(ht.getSection()))
                    .addNamedParameter("ename", strParam(ht.getExamName()))
                    .addNamedParameter("etype", strParam(ht.getExamType()))
                    .addNamedParameter("esubj", strParam(ht.getExamSubjects()))
                    .addNamedParameter("ayear", strParam(ht.getAcademicYear()))
                    .addNamedParameter("photo", strParam(ht.getPhotoUrl()))
                    .addNamedParameter("dob", strParam(ht.getDateOfBirth()))
                    .addNamedParameter("gender", strParam(ht.getGender()))
                    .addNamedParameter("regnum", strParam(ht.getRegistrationNumber()))
                    .addNamedParameter("ecenter", strParam(ht.getExamCenter()))
                    .addNamedParameter("ecaddr", strParam(ht.getExamCenterAddress()))
                    .addNamedParameter("active", boolParam(ht.getIsActive()))
                    .addNamedParameter("genby", strParam(ht.getGeneratedBy()))
                    .addNamedParameter("ca", datetimeParam(ht.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(ht.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            ht.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("hall_tickets") +
                    " SET ticket_number=@tnum,student_id=@sid,student_name=@sname,roll_number=@roll," +
                    "class_name=@cname,section=@section,exam_name=@ename,exam_type=@etype,exam_subjects=@esubj," +
                    "academic_year=@ayear,photo_url=@photo,date_of_birth=@dob,gender=@gender," +
                    "registration_number=@regnum,exam_center=@ecenter,exam_center_address=@ecaddr," +
                    "is_active=@active,generated_by=@genby,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("tnum", strParam(ht.getTicketNumber()))
                    .addNamedParameter("sid", int64Param(ht.getStudentId()))
                    .addNamedParameter("sname", strParam(ht.getStudentName()))
                    .addNamedParameter("roll", strParam(ht.getRollNumber()))
                    .addNamedParameter("cname", strParam(ht.getClassName()))
                    .addNamedParameter("section", strParam(ht.getSection()))
                    .addNamedParameter("ename", strParam(ht.getExamName()))
                    .addNamedParameter("etype", strParam(ht.getExamType()))
                    .addNamedParameter("esubj", strParam(ht.getExamSubjects()))
                    .addNamedParameter("ayear", strParam(ht.getAcademicYear()))
                    .addNamedParameter("photo", strParam(ht.getPhotoUrl()))
                    .addNamedParameter("dob", strParam(ht.getDateOfBirth()))
                    .addNamedParameter("gender", strParam(ht.getGender()))
                    .addNamedParameter("regnum", strParam(ht.getRegistrationNumber()))
                    .addNamedParameter("ecenter", strParam(ht.getExamCenter()))
                    .addNamedParameter("ecaddr", strParam(ht.getExamCenterAddress()))
                    .addNamedParameter("active", boolParam(ht.getIsActive()))
                    .addNamedParameter("genby", strParam(ht.getGeneratedBy()))
                    .addNamedParameter("ua", datetimeParam(ht.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(ht.getId()))
                    .build();
            executeQuery(q);
        }
        return ht;
    }

    public Optional<HallTicket> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("hall_tickets") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<HallTicket> findAll() {
        String sql = "SELECT * FROM " + tableRef("hall_tickets");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<HallTicket> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("hall_tickets") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<HallTicket> saveAll(List<HallTicket> tickets) {
        List<HallTicket> saved = new ArrayList<>();
        for (HallTicket ht : tickets) { saved.add(save(ht)); }
        return saved;
    }

    public Optional<HallTicket> findByTicketNumber(String ticketNumber) {
        String sql = "SELECT * FROM " + tableRef("hall_tickets") + " WHERE ticket_number=@tnum LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tnum", strParam(ticketNumber))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<HallTicket> findByStudentIdOrderByCreatedAtDesc(Long studentId) {
        String sql = "SELECT * FROM " + tableRef("hall_tickets") +
                " WHERE student_id=@sid ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .build();
        TableResult result = executeQuery(q);
        List<HallTicket> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<HallTicket> findByClassNameAndExamNameOrderByStudentNameAsc(String className, String examName) {
        String sql = "SELECT * FROM " + tableRef("hall_tickets") +
                " WHERE class_name=@cname AND exam_name=@ename ORDER BY student_name ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("cname", strParam(className))
                .addNamedParameter("ename", strParam(examName))
                .build();
        TableResult result = executeQuery(q);
        List<HallTicket> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<HallTicket> findByExamTypeOrderByCreatedAtDesc(String examType) {
        String sql = "SELECT * FROM " + tableRef("hall_tickets") +
                " WHERE exam_type=@etype ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("etype", strParam(examType))
                .build();
        TableResult result = executeQuery(q);
        List<HallTicket> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<HallTicket> findAllByOrderByCreatedAtDesc() {
        String sql = "SELECT * FROM " + tableRef("hall_tickets") + " ORDER BY created_at DESC";
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<HallTicket> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsByTicketNumber(String ticketNumber) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("hall_tickets") + " WHERE ticket_number=@tnum";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("tnum", strParam(ticketNumber))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("hall_tickets") + " WHERE id=@id";
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
        String sql = "DELETE FROM " + tableRef("hall_tickets") + " WHERE student_id=@sid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
