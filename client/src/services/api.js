import axios from 'axios';

// Base URL for the Spring Boot backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Module-level auth token (no localStorage, no sessionStorage)
let _authToken = null;
export const setAuthToken   = (token) => { _authToken = token; };
export const clearAuthToken = ()       => { _authToken = null; };

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request Interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    if (_authToken) {
      config.headers.Authorization = `Bearer ${_authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired - clear in-memory token and redirect to login
      clearAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH APIs
// ============================================

export const authAPI = {
  login:            (data) => api.post('/api/auth/login', data),
  register:         (data) => api.post('/api/auth/register', data),
  sendLoginOTP: (data) => api.post('/api/auth/forgot-password', data),
  verifyLoginOTP: (data) => api.post('/api/auth/verify-otp', data),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  verifyOTP: (data) => api.post('/api/auth/verify-otp', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  changePassword: (data) => api.post('/api/auth/change-password', data),
  setFirstPassword: (data) => api.post('/api/auth/set-first-password', data),
};

// ============================================
// SUPER ADMIN APIs
// ============================================

export const superAdminAPI = {
  getAdmins:        ()         => api.get('/api/superadmin/admins'),
  getAdminById:     (id)       => api.get(`/api/superadmin/admins/${id}`),
  createAdmin:      (data)     => api.post('/api/superadmin/admins', data),
  updateAdmin:      (id, data) => api.put(`/api/superadmin/admins/${id}`, data),
  deleteAdmin:      (id)       => api.delete(`/api/superadmin/admins/${id}`),
  createSuperAdmin: (data)     => api.post('/api/superadmin/super-admins', data),
  getSuperAdmins:   ()         => api.get('/api/superadmin/super-admins'),
  deleteSuperAdmin: (id)       => api.delete(`/api/superadmin/super-admins/${id}`),
  getMyPermissions: ()         => api.get('/api/admin/permissions'),
};

// ============================================
// ADMIN APIs
// ============================================

export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/api/admin/dashboard/stats'),

  // Attendance Summary (Admin/SuperAdmin)
  getClassAttendanceSummaries: (date) => api.get('/api/admin/attendance/summary', { params: { date } }),
  getClassAttendanceDetails: (classId, date) => api.get(`/api/admin/attendance/classes/${classId}/details`, { params: { date } }),
  getTeacherAttendanceSummary: (teacherId, date) => api.get(`/api/admin/teachers/${teacherId}/attendance-summary`, { params: { date } }),
  getRevenueChart: (period) => api.get(`/api/admin/dashboard/revenue?period=${period}`),
  getAttendanceChart: (period) => api.get(`/api/admin/dashboard/attendance?period=${period}`),

  // Students
  getStudents: (params) => api.get('/api/admin/students', { params }),
  getStudentById: (id) => api.get(`/api/admin/students/${id}`),
  createStudent: (data) => api.post('/api/admin/students', data),
  updateStudent: (id, data) => api.put(`/api/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/api/admin/students/${id}`),
  getStudentCredentials: (id) => api.get(`/api/admin/students/${id}/credentials`),

  // Teachers
  getTeachers: (params) => api.get('/api/admin/teachers', { params }),
  getTeacherById: (id) => api.get(`/api/admin/teachers/${id}`),
  createTeacher: (data) => api.post('/api/admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/api/admin/teachers/${id}`, data),
  resetTeacherPassword: (id, password) => api.put(`/api/admin/teachers/${id}/reset-password`, { password }),
  deleteTeacher: (id) => api.delete(`/api/admin/teachers/${id}`),

  // Classes
  getClasses: () => api.get('/api/admin/classes'),
  createClass: (data) => api.post('/api/admin/classes', data),
  updateClass: (id, data) => api.put(`/api/admin/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/api/admin/classes/${id}`),

  // Fees (legacy)
  getFees: (params) => api.get('/api/admin/fees', { params }),
  getFeesByStudent: (studentId) => api.get(`/api/admin/fees/student/${studentId}`),
  collectFee: (id, data) => api.post(`/api/admin/fees/${id}/collect`, data),
  createFee: (data) => api.post('/api/admin/fees', data),
  updateFee: (id, data) => api.put(`/api/admin/fees/${id}`, data),
  deleteFee: (id) => api.delete(`/api/admin/fees/${id}`),

  // Class Fee Structure
  getClassFeeStructures: () => api.get('/api/admin/class-fees'),
  saveClassFeeStructure: (data) => api.post('/api/admin/class-fees', data),
  deleteClassFeeStructure: (id) => api.delete(`/api/admin/class-fees/${id}`),

  // Student Fee Assignments
  getAllStudentFeeAssignments: () => api.get('/api/admin/student-fee-assignments'),
  getStudentFeeAssignment: (studentId) => api.get(`/api/admin/student-fee-assignments/student/${studentId}`),
  assignStudentFee: (data) => api.post('/api/admin/student-fee-assignments', data),
  getAssignmentPayments: (assignmentId) => api.get(`/api/admin/student-fee-assignments/${assignmentId}/payments`),
  collectAssignmentFee: (assignmentId, data) => api.post(`/api/admin/student-fee-assignments/${assignmentId}/collect`, data),
  getAllFeePayments: () => api.get('/api/admin/fee-payments'),

  // Fee Installments
  getInstallments: (assignmentId) => api.get(`/api/admin/student-fee-assignments/${assignmentId}/installments`),
  collectInstallmentFee: (installmentId, data) => api.post(`/api/admin/fee-installments/${installmentId}/pay`, data),

  // Student search for fee collection
  searchStudentsForFee: (q) => api.get('/api/admin/students/search', { params: { q } }),

  // Expenses
  getExpenses: (params) => api.get('/api/admin/expenses', { params }),
  getExpense: (id) => api.get(`/api/admin/expenses/${id}`),
  getExpenseSummary: () => api.get('/api/admin/expenses/summary'),
  createExpense: (data) => api.post('/api/admin/expenses', data),
  updateExpense: (id, data) => api.put(`/api/admin/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/api/admin/expenses/${id}`),

  // Parents
  getParents: () => api.get('/api/admin/parents'),
  createParent: (data) => api.post('/api/admin/parents', data),
  updateParent: (id, data) => api.put(`/api/admin/parents/${id}`, data),
  resetParentPassword: (id, password) => api.put(`/api/admin/parents/${id}/reset-password`, { password }),
  deleteParent: (id) => api.delete(`/api/admin/parents/${id}`),
};

// ============================================
// TEACHER APIs
// ============================================

export const teacherAPI = {
  // Classes
  getMyClasses: (teacherId) => api.get('/api/teacher/classes', { params: teacherId ? { teacherId } : {} }),
  getMyProfile: () => api.get('/api/teacher/profile'),

  // Students in a class
  getClassStudents: (classId) => api.get(`/api/teacher/class/${classId}/students`),

  // Attendance
  markAttendance: (data) => api.post('/api/teacher/attendance', data),
  getAttendance: (classId, date) => api.get(`/api/teacher/attendance/${classId}`, { params: { date } }),
  getAttendanceSummary: (classId, date) => api.get(`/api/teacher/attendance/${classId}/summary`, { params: { date } }),
  getAttendanceSummaryRange: (classId, startDate, endDate) => api.get(`/api/teacher/attendance/${classId}/summary`, { params: { startDate, endDate } }),
  getAttendanceDates: (classId) => api.get(`/api/teacher/attendance/${classId}/dates`),

  // Assignments
  getAssignments: () => api.get('/api/teacher/assignments'),
  createAssignment: (data) => api.post('/api/teacher/assignments', data),
  updateAssignment: (id, data) => api.put(`/api/teacher/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/api/teacher/assignments/${id}`),

  // Marks
  getMarks: (studentId) => api.get(`/api/teacher/marks/${studentId}`),
  addMarks: (data) => api.post('/api/teacher/marks', data),
  updateMarks: (id, data) => api.put(`/api/teacher/marks/${id}`, data),
  deleteMarks: (id) => api.delete(`/api/teacher/marks/${id}`),
};

// ============================================
// PARENT APIs
// ============================================

export const parentAPI = {
  // Child Info — resolves from JWT (no parentId param needed)
  getMyChildren: () => api.get('/api/parent/me/children'),
  // Legacy — kept for admin use
  getChildInfo: (parentId) => api.get(`/api/parent/child/${parentId}`),

  // Attendance
  getChildAttendance: (studentId, params) =>
    api.get(`/api/parent/attendance/${studentId}`, { params }),

  // Assignments
  getChildAssignments: (studentId) =>
    api.get(`/api/parent/assignments/${studentId}`),

  // Fees
  getChildFees: (studentId) => api.get(`/api/parent/fees/${studentId}`),
  payFee: (data) => api.post('/api/parent/fees/pay', data),

  // Performance/Marks
  getChildMarks: (studentId) => api.get(`/api/parent/marks/${studentId}`),

  // Messages
  getMessages: (parentId) => api.get(`/api/parent/messages/${parentId}`),
  sendMessage: (data) => api.post('/api/parent/messages', data),
};

// ============================================
// STUDENT APIs
// ============================================

export const studentAPI = {
  getMyProfile:    ()       => api.get('/api/student/me'),
  getMyAttendance: (params) => api.get('/api/student/attendance', { params }),
  // Convenience: fetch the full academic year (Jan 1 → today) in one call
  getMyFullAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    const startDate = `${new Date().getFullYear()}-01-01`;
    return api.get('/api/student/attendance', { params: { startDate, endDate: today } });
  },
  getMyMarks:      ()       => api.get('/api/student/marks'),
  getMyFees:       ()       => api.get('/api/student/fees'),
  getMyDiary:      ()       => api.get('/api/student/diary'),
};

// ============================================
// TRANSPORT APIs
// ============================================

export const transportAPI = {
  // Buses
  getBuses:    ()         => api.get('/api/transport/buses'),
  createBus:   (data)     => api.post('/api/transport/buses', data),
  updateBus:   (id, data) => api.put(`/api/transport/buses/${id}`, data),
  deleteBus:   (id)       => api.delete(`/api/transport/buses/${id}`),

  // Routes
  getRoutes:    ()         => api.get('/api/transport/routes'),
  createRoute:  (data)     => api.post('/api/transport/routes', data),
  updateRoute:  (id, data) => api.put(`/api/transport/routes/${id}`, data),
  deleteRoute:  (id)       => api.delete(`/api/transport/routes/${id}`),

  // Drivers
  getDrivers:   ()         => api.get('/api/transport/drivers'),
  createDriver: (data)     => api.post('/api/transport/drivers', data),
  updateDriver: (id, data) => api.put(`/api/transport/drivers/${id}`, data),
  deleteDriver: (id)       => api.delete(`/api/transport/drivers/${id}`),

  // Student Assignments
  getStudentAssignments:   ()         => api.get('/api/transport/students'),
  assignStudent:           (data)     => api.post('/api/transport/students', data),
  updateStudentAssignment: (id, data) => api.put(`/api/transport/students/${id}`, data),
  removeStudentAssignment: (id)       => api.delete(`/api/transport/students/${id}`),

  // Stops
  getStops:    ()         => api.get('/api/transport/stops'),
  createStop:  (data)     => api.post('/api/transport/stops', data),
  updateStop:  (id, data) => api.put(`/api/transport/stops/${id}`, data),
  deleteStop:  (id)       => api.delete(`/api/transport/stops/${id}`),

  // Fees
  getTransportFees:   ()         => api.get('/api/transport/fees'),
  createTransportFee: (data)     => api.post('/api/transport/fees', data),
  updateTransportFee: (id, data) => api.put(`/api/transport/fees/${id}`, data),
  deleteTransportFee: (id)       => api.delete(`/api/transport/fees/${id}`),
  markFeePaid:        (id)       => api.patch(`/api/transport/fees/${id}/pay`),

  // Student Transport Details
  getStudentTransports:    ()         => api.get('/api/transport/student-transport'),
  getStudentTransportById: (id)       => api.get(`/api/transport/student-transport/${id}`),
  createStudentTransport:  (data)     => api.post('/api/transport/student-transport', data),
  updateStudentTransport:  (id, data) => api.put(`/api/transport/student-transport/${id}`, data),
  deleteStudentTransport:  (id)       => api.delete(`/api/transport/student-transport/${id}`),
};

// ============================================
// TIMETABLE APIs
// ============================================

export const timetableAPI = {
  getAll:      (params)     => api.get('/api/timetable', { params }),
  create:      (data)       => api.post('/api/timetable', data),
  update:      (id, data)   => api.put(`/api/timetable/${id}`, data),
  delete:      (id)         => api.delete(`/api/timetable/${id}`),
  bulkCreate:  (data)       => api.post('/api/timetable/bulk', data),
};

// ============================================
// LEAVE APIs
// ============================================

export const leaveAPI = {
  // Admin
  getStudentLeaves:     ()          => api.get('/api/leave/student'),
  getTeacherLeaves:     ()          => api.get('/api/leave/teacher'),
  getMyLeaves:          (id, type)  => api.get(`/api/leave/my/${id}`, { params: { type } }),
  createLeave:          (data)      => api.post('/api/leave', data),
  updateStatus:         (id, data)  => api.put(`/api/leave/${id}/status`, data),
  deleteLeave:          (id)        => api.delete(`/api/leave/${id}`),
  // Student
  submitStudentLeave:   (data)      => api.post('/api/leave/student/submit', data),
  getMyStudentLeaves:   ()          => api.get('/api/leave/student/my'),
  // Teacher
  getClassStudentLeaves: ()         => api.get('/api/leave/teacher/class'),
  approveRejectLeave:   (id, data)  => api.put(`/api/leave/${id}/teacher-action`, data),
};

// ============================================
// ANNOUNCEMENT APIs
// ============================================

export const announcementAPI = {
  getAll:    (role)      => api.get('/api/announcements', { params: role ? { role } : {} }),
  create:    (data)      => api.post('/api/announcements', data),
  update:    (id, data)  => api.put(`/api/announcements/${id}`, data),
  delete:    (id)        => api.delete(`/api/announcements/${id}`),
};

// ============================================
// HOMEWORK APIs
// ============================================

export const homeworkAPI = {
  getAll:        (params)    => api.get('/api/homework', { params }),
  create:        (data)      => api.post('/api/homework', data),
  update:        (id, data)  => api.put(`/api/homework/${id}`, data),
  delete:        (id)        => api.delete(`/api/homework/${id}`),
};

// ============================================
// MESSAGE APIs
// ============================================

export const messageAPI = {
  getMessages:      (userId)       => api.get(`/api/messages/${userId}`),
  getConversation:  (u1, u2)       => api.get('/api/messages/conversation', { params: { u1, u2 } }),
  sendMessage:      (data)         => api.post('/api/messages', data),
  markAsRead:       (id)           => api.patch(`/api/messages/${id}/read`),
  getUnreadCount:   (userId)       => api.get(`/api/messages/unread/${userId}`),
};

// ============================================
// APPLICATION APIs
// ============================================

export const applicationAPI = {
  getAll:         (status)     => api.get('/api/applications', { params: status ? { status } : {} }),
  create:         (data)       => api.post('/api/applications', data),
  updateStatus:   (id, data)   => api.put(`/api/applications/${id}/status`, data),
  delete:         (id)         => api.delete(`/api/applications/${id}`),
};

// ============================================
// SALARY APIs
// ============================================

export const salaryAPI = {
  getAll:          (params)    => api.get('/api/salary', { params }),
  create:          (data)      => api.post('/api/salary', data),
  update:          (id, data)  => api.put(`/api/salary/${id}`, data),
  delete:          (id)        => api.delete(`/api/salary/${id}`),
  updateLeaves:    (id, data)  => api.patch(`/api/salary/${id}/leaves`, data),
  collectPayment:  (id, data)  => api.post(`/api/salary/${id}/collect`, data),
  getPayments:     (id)        => api.get(`/api/salary/${id}/payments`),
  getAllPayments:   ()          => api.get('/api/salary/payments'),
  getHolidays:     ()          => api.get('/api/salary/holidays'),
  addHoliday:      (data)      => api.post('/api/salary/holidays', data),
  deleteHoliday:   (id)        => api.delete(`/api/salary/holidays/${id}`),
};

// ============================================
// DIARY APIs
// ============================================

export const diaryAPI = {
  // Super Admin / Admin: all entries with optional filters
  getAll:         (params)     => api.get('/api/diary', { params }),
  // Teacher / Parent: entries for a specific class
  getByClass:     (className)  => api.get(`/api/diary/class/${encodeURIComponent(className)}`),
  // Teacher: get their own diary entries
  getForTeacher:  ()           => api.get('/api/diary/teacher'),
  // Teacher: create diary entry
  create:         (data)       => api.post('/api/diary', data),
  // Teacher: update their own diary entry
  updateEntry:    (id, data)   => api.put(`/api/diary/${id}`, data),
  // Admin / Super Admin: update review status + comment
  updateReview:   (id, data)   => api.patch(`/api/diary/${id}/review`, data),
  // Admin / Super Admin: delete entry
  delete:         (id)         => api.delete(`/api/diary/${id}`),
};

// ============================================
// NOTIFICATION APIs
// ============================================

export const notificationAPI = {
  getForUser:     (userId) => api.get('/api/notifications', { params: { userId } }),
  getUnreadCount: (userId) => api.get('/api/notifications/unread-count', { params: { userId } }),
  markRead:       (id)     => api.patch(`/api/notifications/${id}/read`),
  markAllRead:    (userId) => api.patch('/api/notifications/read-all', {}, { params: { userId } }),
  delete:         (id)     => api.delete(`/api/notifications/${id}`),
};

// ============================================
// GENERAL APIs
// ============================================

export const generalAPI = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (data) => api.put('/api/user/profile', data),
  uploadFile: (formData) =>
    api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ============================================
// SCHOOL APIs (multi-tenancy)
// ============================================

export const schoolAPI = {
  /** SUPER_ADMIN: create a new school with optional logo file */
  createSchool: (data, logoFile) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (logoFile) formData.append('logo', logoFile);
    return api.post('/api/schools', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** SUPER_ADMIN: list all schools */
  getAllSchools: () => api.get('/api/schools'),

  /** Any authenticated user: fetch the school linked to their account */
  getMySchool: () => api.get('/api/schools/by-admin'),

  /** Any authenticated user: fetch school by id */
  getSchoolById: (id) => api.get(`/api/schools/${id}`),

  /** SUPER_ADMIN / ADMIN: update school details (with optional new logo) */
  updateSchool: (id, data, logoFile) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (logoFile) formData.append('logo', logoFile);
    return api.put(`/api/schools/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** SUPER_ADMIN / ADMIN: replace logo only */
  updateLogo: (id, logoFile) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    return api.patch(`/api/schools/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============================================
// EXAMINATION & CERTIFICATES APIs
// ============================================

export const examinationAPI = {
  // Exam Schedules
  getSchedules:    (params)     => api.get('/api/examination/schedules', { params }),
  createSchedule:  (data)       => api.post('/api/examination/schedules', data),
  updateSchedule:  (id, data)   => api.put(`/api/examination/schedules/${id}`, data),
  deleteSchedule:  (id)         => api.delete(`/api/examination/schedules/${id}`),

  // Hall Tickets
  getHallTickets:           (params)    => api.get('/api/examination/hall-tickets', { params }),
  getHallTicketsByStudent:  (studentId) => api.get(`/api/examination/hall-tickets/student/${studentId}`),
  createHallTicket:         (data)      => api.post('/api/examination/hall-tickets', data),
  generateBulkHallTickets:  (data)      => api.post('/api/examination/hall-tickets/bulk', data),
  deleteHallTicket:         (id)        => api.delete(`/api/examination/hall-tickets/${id}`),

  // Certificates
  getCertificates:           (params)    => api.get('/api/examination/certificates', { params }),
  getCertificatesByStudent:  (studentId) => api.get(`/api/examination/certificates/student/${studentId}`),
  findByCertId:              (certId)    => api.get(`/api/examination/certificates/verify/${certId}`),
  createCertificate:         (data)      => api.post('/api/examination/certificates', data),
  verifyCertificate:         (id)        => api.patch(`/api/examination/certificates/${id}/verify`),
  deleteCertificate:         (id)        => api.delete(`/api/examination/certificates/${id}`),
};

export default api;
