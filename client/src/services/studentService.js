/**
 * studentService.js
 * API-only CRUD for students. No mock fallback — only real DB data is shown.
 */
import { adminAPI } from './api';

/** Normalize a backend Student object to the field names used by the frontend */
const normalizeStudent = (s) => ({
  id:               s.id,
  name:             s.name             ?? s.studentName ?? '',
  rollNo:           s.rollNo           ?? s.rollNumber  ?? '',
  class:            s.class            ?? s.className   ?? '',
  section:          s.section          ?? '',
  dob:              s.dob              ?? s.dateOfBirth ?? '',
  admissionNumber:  s.admissionNumber  ?? s.admission_number ?? '',
  bloodGroup:       s.bloodGroup       ?? '',
  status:           s.status           ?? (s.studentUserId ? (s.isActive === false ? 'Inactive' : 'Active') : 'Inactive'),
  studentUserId:    s.studentUserId    ?? null,
  photo:            s.photo            ?? s.photoUrl    ?? null,
  fatherName:       s.fatherName       ?? s.parentName  ?? '',
  fatherPhone:      s.fatherPhone      ?? s.parentMobile ?? s.parentPhone ?? '',
  motherName:       s.motherName       ?? '',
  motherPhone:      s.motherPhone      ?? s.motherMobile ?? '',
  guardianName:     s.guardianName     ?? '',
  guardianPhone:    s.guardianPhone    ?? s.guardianMobile ?? '',
  permanentAddress: s.permanentAddress ?? s.address     ?? '',
  alternateAddress: s.alternateAddress ?? '',
  idProof:          s.idProof          ?? null,
  idProofName:      s.idProofName      ?? '',
  tcDocument:       s.tcDocument       ?? null,
  tcDocumentName:   s.tcDocumentName   ?? '',
  bonafideDocument: s.bonafideDocument ?? null,
  bonafideDocumentName: s.bonafideDocumentName ?? '',
  // legacy compat
  parent:  s.parent  ?? s.fatherName ?? s.parentName  ?? '',
  mobile:  s.mobile  ?? s.fatherPhone ?? s.parentMobile ?? '',
  address: s.address ?? s.permanentAddress ?? '',
});

/**
 * Fetch a single page of students with optional server-side filters.
 * Returns { content, totalElements, totalPages, currentPage }.
 * Replaces the old "load everything" approach — only the visible page is fetched.
 */
export const fetchStudents = async ({ page = 0, size = 20, search = '', className = '', status = '' } = {}) => {
  try {
    const res = await adminAPI.getStudents({ page, size, search, className, status });
    const pageData = res.data?.data;
    const content = (pageData?.content ?? (Array.isArray(pageData) ? pageData : [])).map(normalizeStudent);
    return {
      content,
      totalElements: pageData?.totalElements ?? content.length,
      totalPages:    pageData?.totalPages    ?? 1,
      currentPage:   pageData?.number        ?? page,
    };
  } catch (err) {
    console.error('[studentService] fetchStudents failed:', err?.response?.status, err?.message);
    return { content: [], totalElements: 0, totalPages: 0, currentPage: 0 };
  }
};

/** Create a new student */
export const createStudent = async (studentData) => {
  try {
    const res = await adminAPI.createStudent(studentData);
    const backendData = res.data?.data ?? {};
    // backendData shape: { student, studentUsername, studentTempPassword, newParentCreated, parentEmail, parentMobile, parentTempPassword }
    const studentObj = backendData.student ?? backendData;
    const saved = normalizeStudent({ ...studentData, ...studentObj });
    return {
      success: true,
      data: {
        ...saved,
        studentEmail:       backendData.studentEmail       ?? null,
        studentUsername:    backendData.studentUsername    ?? null,
        studentTempPassword: backendData.studentTempPassword ?? null,
        newParentCreated:   backendData.newParentCreated   ?? false,
        parentEmail:        backendData.parentEmail        ?? null,
        parentMobile:       backendData.parentMobile       ?? null,
        parentTempPassword: backendData.parentTempPassword ?? null,
      },
      message: res.data?.message,
    };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to save student. Please try again.';
    return { success: false, message: msg };
  }
};

/** Update a student by id */
export const updateStudent = async (id, studentData) => {
  try {
    const res = await adminAPI.updateStudent(id, studentData);
    const backendData = res.data?.data ?? {};
    const saved = normalizeStudent({ ...studentData, ...backendData });
    return { success: true, data: saved, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to update student. Please try again.';
    return { success: false, message: msg };
  }
};

/** Delete a student by id */
export const deleteStudent = async (id) => {
  try {
    await adminAPI.deleteStudent(id);
    return true;
  } catch (err) {
    console.error('[studentService] deleteStudent failed:', err?.response?.status, err?.message);
    return false;
  }
};

export default { fetchStudents, createStudent, updateStudent, deleteStudent };
