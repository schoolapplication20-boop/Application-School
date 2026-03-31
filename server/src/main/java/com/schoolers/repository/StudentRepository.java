package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class StudentRepository extends BigQueryBaseRepository {
    private static final String T = "students";
    private String tbl() { return tableRef(T); }

    private Student map(FieldValueList r) {
        Student s = new Student();
        s.setId(longVal(r, "id"));
        s.setName(str(r, "name"));
        s.setRollNumber(str(r, "roll_number"));
        s.setClassName(str(r, "class_name"));
        s.setSection(str(r, "section"));
        s.setParentId(longVal(r, "parent_id"));
        s.setParentName(str(r, "parent_name"));
        s.setParentMobile(str(r, "parent_mobile"));
        s.setBloodGroup(str(r, "blood_group"));
        s.setMotherName(str(r, "mother_name"));
        s.setMotherMobile(str(r, "mother_mobile"));
        s.setGuardianName(str(r, "guardian_name"));
        s.setGuardianMobile(str(r, "guardian_mobile"));
        s.setPhotoUrl(str(r, "photo_url"));
        s.setDateOfBirth(dateVal(r, "date_of_birth"));
        s.setAddress(str(r, "address"));
        s.setAlternateAddress(str(r, "alternate_address"));
        s.setIdProof(str(r, "id_proof"));
        s.setIdProofName(str(r, "id_proof_name"));
        s.setTcDocument(str(r, "tc_document"));
        s.setTcDocumentName(str(r, "tc_document_name"));
        s.setBonafideDocument(str(r, "bonafide_document"));
        s.setBonafideDocumentName(str(r, "bonafide_document_name"));
        s.setIsActive(boolVal(r, "is_active"));
        s.setCreatedAt(datetimeVal(r, "created_at"));
        s.setUpdatedAt(datetimeVal(r, "updated_at"));
        return s;
    }

    public Student save(Student s) {
        if (s.getId() == null) {
            s.setId(generateNextId(T));
            s.setCreatedAt(now());
            s.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,name,roll_number,class_name,section,parent_id,parent_name,parent_mobile,blood_group,mother_name,mother_mobile,guardian_name,guardian_mobile,photo_url,date_of_birth,address,alternate_address,id_proof,id_proof_name,tc_document,tc_document_name,bonafide_document,bonafide_document_name,is_active,created_at,updated_at) VALUES (@id,@name,@roll,@cls,@sec,@pid,@pname,@pmob,@bg,@mname,@mmob,@gname,@gmob,@photo,@dob,@addr,@altaddr,@idp,@idpn,@tcd,@tcdn,@bond,@bondn,@active,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(s.getId()))
                .addNamedParameter("name", strParam(s.getName()))
                .addNamedParameter("roll", strParam(s.getRollNumber()))
                .addNamedParameter("cls", strParam(s.getClassName()))
                .addNamedParameter("sec", strParam(s.getSection()))
                .addNamedParameter("pid", int64Param(s.getParentId()))
                .addNamedParameter("pname", strParam(s.getParentName()))
                .addNamedParameter("pmob", strParam(s.getParentMobile()))
                .addNamedParameter("bg", strParam(s.getBloodGroup()))
                .addNamedParameter("mname", strParam(s.getMotherName()))
                .addNamedParameter("mmob", strParam(s.getMotherMobile()))
                .addNamedParameter("gname", strParam(s.getGuardianName()))
                .addNamedParameter("gmob", strParam(s.getGuardianMobile()))
                .addNamedParameter("photo", strParam(s.getPhotoUrl()))
                .addNamedParameter("dob", dateParam(s.getDateOfBirth()))
                .addNamedParameter("addr", strParam(s.getAddress()))
                .addNamedParameter("altaddr", strParam(s.getAlternateAddress()))
                .addNamedParameter("idp", strParam(s.getIdProof()))
                .addNamedParameter("idpn", strParam(s.getIdProofName()))
                .addNamedParameter("tcd", strParam(s.getTcDocument()))
                .addNamedParameter("tcdn", strParam(s.getTcDocumentName()))
                .addNamedParameter("bond", strParam(s.getBonafideDocument()))
                .addNamedParameter("bondn", strParam(s.getBonafideDocumentName()))
                .addNamedParameter("active", boolParam(s.getIsActive()))
                .addNamedParameter("ca", datetimeParam(s.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(s.getUpdatedAt()))
                .build());
        } else {
            s.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET name=@name,roll_number=@roll,class_name=@cls,section=@sec,parent_id=@pid,parent_name=@pname,parent_mobile=@pmob,blood_group=@bg,mother_name=@mname,mother_mobile=@mmob,guardian_name=@gname,guardian_mobile=@gmob,photo_url=@photo,date_of_birth=@dob,address=@addr,alternate_address=@altaddr,id_proof=@idp,id_proof_name=@idpn,tc_document=@tcd,tc_document_name=@tcdn,bonafide_document=@bond,bonafide_document_name=@bondn,is_active=@active,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(s.getId()))
                .addNamedParameter("name", strParam(s.getName()))
                .addNamedParameter("roll", strParam(s.getRollNumber()))
                .addNamedParameter("cls", strParam(s.getClassName()))
                .addNamedParameter("sec", strParam(s.getSection()))
                .addNamedParameter("pid", int64Param(s.getParentId()))
                .addNamedParameter("pname", strParam(s.getParentName()))
                .addNamedParameter("pmob", strParam(s.getParentMobile()))
                .addNamedParameter("bg", strParam(s.getBloodGroup()))
                .addNamedParameter("mname", strParam(s.getMotherName()))
                .addNamedParameter("mmob", strParam(s.getMotherMobile()))
                .addNamedParameter("gname", strParam(s.getGuardianName()))
                .addNamedParameter("gmob", strParam(s.getGuardianMobile()))
                .addNamedParameter("photo", strParam(s.getPhotoUrl()))
                .addNamedParameter("dob", dateParam(s.getDateOfBirth()))
                .addNamedParameter("addr", strParam(s.getAddress()))
                .addNamedParameter("altaddr", strParam(s.getAlternateAddress()))
                .addNamedParameter("idp", strParam(s.getIdProof()))
                .addNamedParameter("idpn", strParam(s.getIdProofName()))
                .addNamedParameter("tcd", strParam(s.getTcDocument()))
                .addNamedParameter("tcdn", strParam(s.getTcDocumentName()))
                .addNamedParameter("bond", strParam(s.getBonafideDocument()))
                .addNamedParameter("bondn", strParam(s.getBonafideDocumentName()))
                .addNamedParameter("active", boolParam(s.getIsActive()))
                .addNamedParameter("ua", datetimeParam(s.getUpdatedAt()))
                .build());
        }
        return s;
    }

    public Optional<Student> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Student> findAll() {
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public Optional<Student> findByRollNumber(String rollNumber) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE roll_number=@roll")
            .addNamedParameter("roll", strParam(rollNumber)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Student> findByClassName(String className) {
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE class_name=@cls")
            .addNamedParameter("cls", strParam(className)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Student> findByClassNameAndSection(String className, String section) {
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE class_name=@cls AND section=@sec")
            .addNamedParameter("cls", strParam(className))
            .addNamedParameter("sec", strParam(section)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Student> findByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section) {
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE LOWER(class_name)=LOWER(@cls) AND LOWER(section)=LOWER(@sec)")
            .addNamedParameter("cls", strParam(className))
            .addNamedParameter("sec", strParam(section)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public long countByClassNameAndSection(String className, String section) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE class_name=@cls AND section=@sec")
            .addNamedParameter("cls", strParam(className))
            .addNamedParameter("sec", strParam(section)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public long countByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE LOWER(class_name)=LOWER(@cls) AND LOWER(section)=LOWER(@sec)")
            .addNamedParameter("cls", strParam(className))
            .addNamedParameter("sec", strParam(section)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public List<Student> findByParentId(Long parentId) {
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE parent_id=@pid")
            .addNamedParameter("pid", int64Param(parentId)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public long countByIsActive(Boolean isActive) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE is_active=@active")
            .addNamedParameter("active", boolParam(isActive)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public Page<Student> searchStudents(String search, Pageable pageable) {
        String likePat = "%" + search + "%";
        String countSql = "SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE is_active=true AND (LOWER(name) LIKE LOWER(@search) OR LOWER(roll_number) LIKE LOWER(@search))";
        long total = executeQuery(QueryJobConfiguration.newBuilder(countSql)
            .addNamedParameter("search", strParam(likePat)).build())
            .iterateAll().iterator().next().get("cnt").getLongValue();

        String sql = "SELECT * FROM " + tbl() + " WHERE is_active=true AND (LOWER(name) LIKE LOWER(@search) OR LOWER(roll_number) LIKE LOWER(@search)) LIMIT @lim OFFSET @off";
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder(sql)
            .addNamedParameter("search", strParam(likePat))
            .addNamedParameter("lim", int64Param((long) pageable.getPageSize()))
            .addNamedParameter("off", int64Param((long) pageable.getOffset()))
            .build()).iterateAll().forEach(row -> list.add(map(row)));
        return new PageImpl<>(list, pageable, total);
    }

    public List<Student> searchByNameRollOrPhone(String search) {
        String likePat = "%" + search + "%";
        List<Student> list = new ArrayList<>();
        String sql = "SELECT * FROM " + tbl() + " WHERE LOWER(name) LIKE LOWER(@s) OR LOWER(roll_number) LIKE LOWER(@s) OR parent_mobile LIKE @s OR mother_mobile LIKE @s OR guardian_mobile LIKE @s";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
            .addNamedParameter("s", strParam(likePat)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public Optional<Student> findDuplicateInClass(String rollNumber, String className, String section) {
        String sql = "SELECT * FROM " + tbl() + " WHERE LOWER(roll_number)=LOWER(@roll) AND LOWER(class_name)=LOWER(@cls) AND LOWER(COALESCE(section,''))=LOWER(COALESCE(@sec,''))";
        Iterator<FieldValueList> it = executeQuery(QueryJobConfiguration.newBuilder(sql)
            .addNamedParameter("roll", strParam(rollNumber))
            .addNamedParameter("cls", strParam(className))
            .addNamedParameter("sec", strParam(section)).build())
            .iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public long deleteByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE LOWER(class_name)=LOWER(@cls) AND LOWER(section)=LOWER(@sec)")
            .addNamedParameter("cls", strParam(className))
            .addNamedParameter("sec", strParam(section)).build());
        return r.getTotalRows();
    }

    public boolean existsById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public Page<Student> findAll(Pageable pageable) {
        long total = count();
        String sql = "SELECT * FROM " + tbl() + " ORDER BY created_at DESC LIMIT @lim OFFSET @off";
        List<Student> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder(sql)
            .addNamedParameter("lim", int64Param((long) pageable.getPageSize()))
            .addNamedParameter("off", int64Param((long) pageable.getOffset()))
            .build()).iterateAll().forEach(row -> list.add(map(row)));
        return new PageImpl<>(list, pageable, total);
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }
}
