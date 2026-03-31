package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.AdmissionApplication;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class AdmissionApplicationRepository extends BigQueryBaseRepository {

    private AdmissionApplication map(com.google.cloud.bigquery.FieldValueList row) {
        AdmissionApplication a = new AdmissionApplication();
        a.setId(longVal(row, "id"));
        a.setStudentName(str(row, "student_name"));
        a.setDob(str(row, "dob"));
        a.setGender(str(row, "gender"));
        a.setClassApplied(str(row, "class_applied"));
        a.setFatherName(str(row, "father_name"));
        a.setFatherPhone(str(row, "father_phone"));
        a.setMotherName(str(row, "mother_name"));
        a.setMotherPhone(str(row, "mother_phone"));
        a.setGuardianName(str(row, "guardian_name"));
        a.setGuardianPhone(str(row, "guardian_phone"));
        a.setEmail(str(row, "email"));
        a.setPrevSchool(str(row, "prev_school"));
        a.setPermanentAddress(str(row, "permanent_address"));
        a.setAlternateAddress(str(row, "alternate_address"));
        String statusStr = str(row, "status");
        if (statusStr != null) a.setStatus(AdmissionApplication.Status.valueOf(statusStr));
        a.setIdProof(str(row, "id_proof"));
        a.setIdProofName(str(row, "id_proof_name"));
        a.setTcDoc(str(row, "tc_doc"));
        a.setTcDocName(str(row, "tc_doc_name"));
        a.setBonafideDoc(str(row, "bonafide_doc"));
        a.setBonafideDocName(str(row, "bonafide_doc_name"));
        a.setCreatedAt(datetimeVal(row, "created_at"));
        a.setUpdatedAt(datetimeVal(row, "updated_at"));
        return a;
    }

    public AdmissionApplication save(AdmissionApplication a) {
        if (a.getId() == null) {
            a.setId(generateNextId("admission_applications"));
            a.setCreatedAt(now());
            a.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("admission_applications") +
                    " (id,student_name,dob,gender,class_applied,father_name,father_phone,mother_name,mother_phone," +
                    "guardian_name,guardian_phone,email,prev_school,permanent_address,alternate_address,status," +
                    "id_proof,id_proof_name,tc_doc,tc_doc_name,bonafide_doc,bonafide_doc_name,created_at,updated_at)" +
                    " VALUES (@id,@sname,@dob,@gender,@capplied,@fname,@fphone,@mname,@mphone,@gname,@gphone," +
                    "@email,@prevsch,@permaddr,@altaddr,@status,@idproof,@idpname,@tcdoc,@tcdname,@bdoc,@bdname,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(a.getId()))
                    .addNamedParameter("sname", strParam(a.getStudentName()))
                    .addNamedParameter("dob", strParam(a.getDob()))
                    .addNamedParameter("gender", strParam(a.getGender()))
                    .addNamedParameter("capplied", strParam(a.getClassApplied()))
                    .addNamedParameter("fname", strParam(a.getFatherName()))
                    .addNamedParameter("fphone", strParam(a.getFatherPhone()))
                    .addNamedParameter("mname", strParam(a.getMotherName()))
                    .addNamedParameter("mphone", strParam(a.getMotherPhone()))
                    .addNamedParameter("gname", strParam(a.getGuardianName()))
                    .addNamedParameter("gphone", strParam(a.getGuardianPhone()))
                    .addNamedParameter("email", strParam(a.getEmail()))
                    .addNamedParameter("prevsch", strParam(a.getPrevSchool()))
                    .addNamedParameter("permaddr", strParam(a.getPermanentAddress()))
                    .addNamedParameter("altaddr", strParam(a.getAlternateAddress()))
                    .addNamedParameter("status", strParam(a.getStatus() != null ? a.getStatus().name() : null))
                    .addNamedParameter("idproof", strParam(a.getIdProof()))
                    .addNamedParameter("idpname", strParam(a.getIdProofName()))
                    .addNamedParameter("tcdoc", strParam(a.getTcDoc()))
                    .addNamedParameter("tcdname", strParam(a.getTcDocName()))
                    .addNamedParameter("bdoc", strParam(a.getBonafideDoc()))
                    .addNamedParameter("bdname", strParam(a.getBonafideDocName()))
                    .addNamedParameter("ca", datetimeParam(a.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(a.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            a.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("admission_applications") +
                    " SET student_name=@sname,dob=@dob,gender=@gender,class_applied=@capplied,father_name=@fname," +
                    "father_phone=@fphone,mother_name=@mname,mother_phone=@mphone,guardian_name=@gname," +
                    "guardian_phone=@gphone,email=@email,prev_school=@prevsch,permanent_address=@permaddr," +
                    "alternate_address=@altaddr,status=@status,id_proof=@idproof,id_proof_name=@idpname," +
                    "tc_doc=@tcdoc,tc_doc_name=@tcdname,bonafide_doc=@bdoc,bonafide_doc_name=@bdname,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("sname", strParam(a.getStudentName()))
                    .addNamedParameter("dob", strParam(a.getDob()))
                    .addNamedParameter("gender", strParam(a.getGender()))
                    .addNamedParameter("capplied", strParam(a.getClassApplied()))
                    .addNamedParameter("fname", strParam(a.getFatherName()))
                    .addNamedParameter("fphone", strParam(a.getFatherPhone()))
                    .addNamedParameter("mname", strParam(a.getMotherName()))
                    .addNamedParameter("mphone", strParam(a.getMotherPhone()))
                    .addNamedParameter("gname", strParam(a.getGuardianName()))
                    .addNamedParameter("gphone", strParam(a.getGuardianPhone()))
                    .addNamedParameter("email", strParam(a.getEmail()))
                    .addNamedParameter("prevsch", strParam(a.getPrevSchool()))
                    .addNamedParameter("permaddr", strParam(a.getPermanentAddress()))
                    .addNamedParameter("altaddr", strParam(a.getAlternateAddress()))
                    .addNamedParameter("status", strParam(a.getStatus() != null ? a.getStatus().name() : null))
                    .addNamedParameter("idproof", strParam(a.getIdProof()))
                    .addNamedParameter("idpname", strParam(a.getIdProofName()))
                    .addNamedParameter("tcdoc", strParam(a.getTcDoc()))
                    .addNamedParameter("tcdname", strParam(a.getTcDocName()))
                    .addNamedParameter("bdoc", strParam(a.getBonafideDoc()))
                    .addNamedParameter("bdname", strParam(a.getBonafideDocName()))
                    .addNamedParameter("ua", datetimeParam(a.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(a.getId()))
                    .build();
            executeQuery(q);
        }
        return a;
    }

    public Optional<AdmissionApplication> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("admission_applications") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<AdmissionApplication> findAll() {
        String sql = "SELECT * FROM " + tableRef("admission_applications");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<AdmissionApplication> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("admission_applications") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<AdmissionApplication> findByStatus(AdmissionApplication.Status status) {
        String sql = "SELECT * FROM " + tableRef("admission_applications") + " WHERE status=@status";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("status", strParam(status.name()))
                .build();
        TableResult result = executeQuery(q);
        List<AdmissionApplication> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<AdmissionApplication> findAllByOrderByCreatedAtDesc() {
        String sql = "SELECT * FROM " + tableRef("admission_applications") + " ORDER BY created_at DESC";
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<AdmissionApplication> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("admission_applications") + " WHERE id=@id";
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
