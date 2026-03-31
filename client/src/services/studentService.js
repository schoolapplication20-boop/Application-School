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
  bloodGroup:       s.bloodGroup       ?? '',
  status:           s.status           ?? (s.isActive === false ? 'Inactive' : s.isActive === true ? 'Active' : 'Active'),
  photo:            s.photo            ?? s.photoUrl    ?? null,
  fatherName:       s.fatherName       ?? s.parentName  ?? '',
  fatherPhone:      s.fatherPhone      ?? s.parentMobile ?? s.parentPhone ?? '',
  motherName:       s.motherName       ?? '',
  motherPhone:      s.motherPhone      ?? '',
  guardianName:     s.guardianName     ?? '',
  guardianPhone:    s.guardianPhone    ?? '',
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

/** Fetch all students — returns empty array if API unavailable */
export const fetchStudents = async () => {
  try {
    const res = await adminAPI.getStudents({ page: 0, size: 1000 });
    const page = res.data?.data;
    const data = page?.content ?? (Array.isArray(page) ? page : []);
    return Array.isArray(data) ? data.map(normalizeStudent) : [];
  } catch {
    return [];
  }
};

/** Create a new student */
export const createStudent = async (studentData) => {
  try {
    const res = await adminAPI.createStudent(studentData);
    const backendData = res.data?.data ?? {};
    const saved = normalizeStudent({ ...studentData, ...backendData });
    return { success: true, data: saved, message: res.data?.message };
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
  } catch {
    return false;
  }
};

export default { fetchStudents, createStudent, updateStudent, deleteStudent };
