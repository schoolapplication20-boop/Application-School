import axios from 'axios';

// Base URL for the Spring Boot backend
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Auth token stored in sessionStorage so it survives page refresh
// (cleared automatically when the browser tab is closed — safer than localStorage)
const SESSION_KEY = 'ms_auth_token';
let _authToken = sessionStorage.getItem(SESSION_KEY) || null;
export const setAuthToken   = (token) => { _authToken = token; sessionStorage.setItem(SESSION_KEY, token); };
export const clearAuthToken = ()       => { _authToken = null; sessionStorage.removeItem(SESSION_KEY); };

// ── Server wake-up retry (Render free plan cold starts) ──────────────────────
let _isServerSleeping = false;
let _retryAborted     = false;
export const abortServerRetry = () => { _retryAborted = true; };

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES    = 15;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const isNetworkError = (err) =>
  !err.response && (
    err.code === 'ERR_NETWORK' ||
    err.code === 'ERR_CONNECTION_REFUSED' ||
    err.message === 'Network Error'
  );

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request Interceptor - attach JWT token (module var, seeded from sessionStorage on load)
api.interceptors.request.use(
  (config) => {
    const token = _authToken || sessionStorage.getItem(SESSION_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - handle token expiry + server wake-up retry
api.interceptors.response.use(
  (response) => {
    // Server came back online — hide wake modal if it was showing
    if (_isServerSleeping) {
      _isServerSleeping = false;
      window.dispatchEvent(new CustomEvent('server-awake'));
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    // 401: token expired (skip on auth endpoints to avoid redirect loops)
    const isAuthEndpoint = config?.url?.includes('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearAuthToken();
      // Fire a custom event so AuthContext can show a graceful "session expired" dialog
      // instead of hard-redirecting and losing any unsaved form data.
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      return Promise.reject(error);
    }

    // Network error: server sleeping / cold start — retry with countdown
    if (isNetworkError(error) && config) {
      config._retryCount = (config._retryCount || 0) + 1;

      if (config._retryCount > MAX_RETRIES || _retryAborted) {
        // Give up
        _retryAborted = false;
        if (_isServerSleeping) {
          _isServerSleeping = false;
          window.dispatchEvent(new CustomEvent('server-awake'));
        }
        return Promise.reject(error);
      }

      // Notify UI
      _isServerSleeping = true;
      window.dispatchEvent(new CustomEvent('server-sleeping', {
        detail: { retryIn: RETRY_DELAY_MS / 1000 },
      }));

      await sleep(RETRY_DELAY_MS);

      // User pressed Cancel while sleeping
      if (_retryAborted) {
        _retryAborted     = false;
        _isServerSleeping = false;
        window.dispatchEvent(new CustomEvent('server-awake'));
        return Promise.reject(new Error('Request cancelled — server still waking up.'));
      }

      return api(config); // retry — interceptors run again naturally
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH APIs
// ============================================

export const onboardingVerifyAPI = {
  sendOtp:   (email)       => api.post('/api/auth/onboarding/send-otp',   { email }),
  verifyOtp: (email, otp)  => api.post('/api/auth/onboarding/verify-otp', { email, otp }),
};

export const authAPI = {
  login:          (data) => api.post('/api/auth/login', data),
  register:       (data) => api.post('/api/auth/register', data),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  verifyOTP:      (data) => api.post('/api/auth/verify-otp', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  changePassword: (data) => api.post('/api/auth/change-password', data),
  setFirstPassword: (data) => api.post('/api/auth/set-first-password', data),
  verifyEmail:      (data) => api.post('/api/auth/verify-email', data),
  verifyOwnerOtp:   (data) => api.post('/api/auth/verify-owner-otp', data),
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
  deleteSchool:     (id)            => api.delete(`/api/superadmin/schools/${id}`),
  suspendSchool:    (id)            => api.put(`/api/superadmin/schools/${id}/suspend`),
  reactivateSchool: (id, expiryDate) => api.put(`/api/superadmin/schools/${id}/reactivate`, { expiryDate }),
  getMyPermissions: ()              => api.get('/api/admin/permissions'),
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
  onboardStudent: (id, email) => api.post(`/api/admin/students/${id}/onboard`, { email }),
  promoteStudents: (data) => api.post('/api/admin/students/promote', data),

  // Bulk Import
  bulkImportStudents:  (data)  => api.post('/api/admin/students/bulk-import', data),
  getImportHistory:    ()      => api.get('/api/admin/students/bulk-import/history'),
  getImportFailedRows: (logId) => api.get(`/api/admin/students/bulk-import/${logId}/failed`),

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
  getClassCapacityInfo: (className, section) => api.get('/api/admin/classes/capacity-check', { params: { className, section: section || '' } }),

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
  deleteStudentFeeAssignment: (id) => api.delete(`/api/admin/student-fee-assignments/${id}`),
  getAssignmentPayments: (assignmentId) => api.get(`/api/admin/student-fee-assignments/${assignmentId}/payments`),
  collectAssignmentFee: (assignmentId, data) => api.post(`/api/admin/student-fee-assignments/${assignmentId}/collect`, data),
  getAllFeePayments: () => api.get('/api/admin/fee-payments'),

  // Fee Installments
  getInstallments: (assignmentId) => api.get(`/api/admin/student-fee-assignments/${assignmentId}/installments`),
  collectInstallmentFee: (installmentId, data) => api.post(`/api/admin/fee-installments/${installmentId}/pay`, data),

  // Student search for fee collection
  searchStudentsForFee: (q, className, section) => api.get('/api/admin/students/search', { params: { q: q || undefined, className: className || undefined, section: section || undefined } }),

  // Academic Year Rollover
  yearRollover: (data) => api.post('/api/admin/year-rollover', data),

  // School fee summary (SUPER_ADMIN / ADMIN)
  getSchoolFeeSummary: () => api.get('/api/admin/fee-summary'),

  // Expenses
  getExpenses: (params) => api.get('/api/admin/expenses', { params }),
  getExpense: (id) => api.get(`/api/admin/expenses/${id}`),
  getExpenseSummary: () => api.get('/api/admin/expenses/summary'),
  createExpense: (data) => api.post('/api/admin/expenses', data),
  updateExpense: (id, data) => api.put(`/api/admin/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/api/admin/expenses/${id}`),

};

// ============================================
// TEACHER APIs
// ============================================

export const teacherAPI = {
  // Classes
  getMyClasses: (teacherId) => api.get('/api/teacher/classes', { params: teacherId ? { teacherId } : {} }),
  getMyProfile: () => api.get('/api/teacher/profile'),
  getClassTeacherAssignment: () => api.get('/api/teacher/class-teacher-assignment'),

  // Students in a class
  getClassStudents: (classId) => api.get(`/api/teacher/class/${classId}/students`),
  resetStudentPassword: (studentId, password) => api.put(`/api/teacher/students/${studentId}/reset-password`, { password }),
  onboardStudent: (studentId, email) => api.post(`/api/teacher/students/${studentId}/onboard`, { email }),

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
  getAssignmentSubmissions: (id) => api.get(`/api/teacher/assignments/${id}/submissions`),
  gradeSubmission: (assignmentId, subId, data) => api.put(`/api/teacher/assignments/${assignmentId}/submissions/${subId}/grade`, data),

  // Marks
  getMarks: (studentId) => api.get(`/api/teacher/marks/${studentId}`),
  getMarksByClass: (classId) => api.get(`/api/teacher/marks/by-class/${classId}`),
  addMarks: (data) => api.post('/api/teacher/marks', data),
  updateMarks: (id, data) => api.put(`/api/teacher/marks/${id}`, data),
  deleteMarks: (id) => api.delete(`/api/teacher/marks/${id}`),
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
    const year = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const startDate = `${year}-04-01`;
    return api.get('/api/student/attendance', { params: { startDate, endDate: today } });
  },
  getMyMarks:          ()         => api.get('/api/student/marks'),
  getMyFees:           ()         => api.get('/api/student/fees'),
  getMyDiary:          ()         => api.get('/api/student/diary'),
  getMyAssignments:    ()         => api.get('/api/student/assignments'),
  submitAssignment:    (id, data) => api.post(`/api/student/assignments/${id}/submit`, data),
  getMySubmissions:    ()         => api.get('/api/student/assignments/my-submissions'),
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
// MESSAGE APIs
// ============================================

export const messageAPI = {
  getMessages:          (userId)   => api.get(`/api/messages/${userId}`),
  getConversation:      (u1, u2)   => api.get('/api/messages/conversation', { params: { u1, u2 } }),
  sendMessage:          (data)     => api.post('/api/messages', data),
  markAsRead:           (id)       => api.patch(`/api/messages/${id}/read`),
  getUnreadCount:       (userId)   => api.get(`/api/messages/unread/${userId}`),
  // Broadcast / student-inbox
  getStudentInbox:      ()         => api.get('/api/messages/student/inbox'),
  getStudentUnreadCount:()         => api.get('/api/messages/student/unread-count'),
  markReadByStudent:    (id)       => api.patch(`/api/messages/student/${id}/read`),
  sendBroadcast:        (data)     => api.post('/api/messages/broadcast', data),
  getBroadcasts:        ()         => api.get('/api/messages/broadcasts'),
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

  /** APPLICATION_OWNER: enable or disable a school (id = display number) */
  toggleSchoolActive: (id, active) => api.patch(`/api/schools/${id}/active`, null, { params: { active } }),

  /** APPLICATION_OWNER: update module feature flags for a school (id = display number) */
  updateFeatures: (id, features) => api.patch(`/api/schools/${id}/features`, features),

  /** Any authenticated user: check whether their school is currently active */
  getMyStatus: () => api.get('/api/schools/my-status'),

  /** APPLICATION_OWNER: list all users (name, email, role) for a school by DB id */
  getSchoolUsers: (schoolDbId) => api.get(`/api/schools/${schoolDbId}/users`),

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

// ============================================
// MARKETING APIs (APPLICATION_OWNER only for reads)
// ============================================

export const marketingAPI = {
  getDemoBookings:       ()           => api.get('/api/marketing/demo-bookings'),
  updateBookingStatus:   (id, status) => api.patch(`/api/marketing/demo-bookings/${id}/status`, null, { params: { status } }),
};

// ============================================
// SYSTEM NOTICE APIs
// ============================================
export const systemAPI = {
  getActiveNotice: ()     => api.get('/api/system/notice'),
  setNotice:       (data) => api.put('/api/system/notice', data),
  clearNotice:     ()     => api.delete('/api/system/notice'),
};

// ============================================
// TEACHER SELF-ATTENDANCE APIs
// ============================================
export const teacherAttendanceAPI = {
  mark:    (data)   => api.post('/api/teacher-attendance/mark', data),
  my:      ()       => api.get('/api/teacher-attendance/my'),
  today:   ()       => api.get('/api/teacher-attendance/today'),
  byDate:  (date)   => api.get('/api/teacher-attendance/by-date', { params: { date } }),
  byRange: (from, to) => api.get('/api/teacher-attendance/by-range', { params: { from, to } }),
};

// ============================================
// SCHOOL CALENDAR APIs
// ============================================
export const calendarAPI = {
  getEvents:    (params) => api.get('/api/school/calendar', { params }),
  createEvent:  (data)   => api.post('/api/school/calendar', data),
  updateEvent:  (id, data) => api.put(`/api/school/calendar/${id}`, data),
  deleteEvent:  (id)     => api.delete(`/api/school/calendar/${id}`),
};

// ============================================
// GRADE SCALE APIs
// ============================================
export const gradeScaleAPI = {
  // Admin: read + save (replace entire scale)
  list:  ()      => api.get('/api/admin/grade-scales'),
  save:  (items) => api.post('/api/admin/grade-scales', items),
  // Teacher / Student: read school's scale
  forTeacher: () => api.get('/api/teacher/grade-scales'),
  forStudent: () => api.get('/api/student/grade-scales'),
};

// ============================================
// EXAM TYPE APIs
// ============================================
export const examTypeAPI = {
  // Admin/super_admin
  list:   ()         => api.get('/api/admin/exam-types'),
  create: (data)     => api.post('/api/admin/exam-types', data),
  update: (id, data) => api.put(`/api/admin/exam-types/${id}`, data),
  remove: (id)       => api.delete(`/api/admin/exam-types/${id}`),
  // Teacher
  listForTeacher: () => api.get('/api/teacher/exam-types'),
  // Student
  listForStudent: () => api.get('/api/student/exam-types'),
};

// ============================================
// REPORT CARD APIs
// ============================================
export const reportCardAPI = {
  // Student
  getMyReportCard:      (examType)  => api.get('/api/student/report-card', { params: examType ? { examType } : {} }),
  getMyFilters:         ()          => api.get('/api/student/report-card/filters'),
  // Admin (legacy)
  getStudentReportCard: (studentId, examType) => api.get(`/api/admin/students/${studentId}/report-card`, { params: examType ? { examType } : {} }),
  // Shared (admin, super admin, teacher)
  getSchoolFilters:     ()          => api.get('/api/report-cards/filters'),
  getClassReportCards:  (params)    => api.get('/api/report-cards/class', { params }),
  getAnyStudentCard:    (studentId, params) => api.get(`/api/report-cards/student/${studentId}`, { params }),
  bulkImportMarksCsv:   (data)      => api.post('/api/teacher/marks/bulk-csv', data),
};

export const meetingAPI = {
  // Teacher
  createSlot:       (data)         => api.post('/api/teacher/meeting-slots', data),
  getTeacherSlots:  ()             => api.get('/api/teacher/meeting-slots'),
  deleteSlot:       (id)           => api.delete(`/api/teacher/meeting-slots/${id}`),
  // Student
  getAvailableSlots: ()            => api.get('/api/student/meeting-slots'),
  bookSlot:         (slotId, data) => api.post(`/api/student/meeting-slots/${slotId}/book`, data),
  getMyBookings:    ()             => api.get('/api/student/meeting-bookings'),
  cancelBooking:    (id)           => api.patch(`/api/student/meeting-bookings/${id}/cancel`),
};

export const appointmentAPI = {
  // Student
  studentRequest:          (data) => api.post('/api/student/appointments', data),
  getStudentAppointments:  ()     => api.get('/api/student/appointments'),
  studentCancel:           (id)   => api.patch(`/api/student/appointments/${id}/cancel`),
  // Teacher
  teacherRequest:          (data) => api.post('/api/teacher/appointments', data),
  getTeacherAppointments:  ()     => api.get('/api/teacher/appointments'),
  teacherRespond:          (id, data) => api.patch(`/api/teacher/appointments/${id}/respond`, data),
  getClassStudents:        ()     => api.get('/api/teacher/appointment-students'),
};

// ============================================
// OWNER ACTION CONFIRMATION APIs
// ============================================

export const ownerAPI = {
  requestActionOtp: ()                       => api.post('/api/owner/confirm/request-otp'),
  verifyActionOtp:  (otp)                    => api.post('/api/owner/confirm/verify-otp', { otp }),
  setUserLimit:     (schoolDbId, userLimit)    => api.patch(`/api/owner/schools/${schoolDbId}/user-limit`, { userLimit }),
  setPricePerUser:  (schoolDbId, pricePerUser) => api.patch(`/api/owner/schools/${schoolDbId}/price-per-user`, { pricePerUser }),
  setPaymentPlan:      (schoolDbId, paymentPlan)  => api.patch(`/api/owner/schools/${schoolDbId}/payment-plan`, { paymentPlan }),
  getPlatformPayments: (schoolDbId)              => api.get(`/api/owner/schools/${schoolDbId}/platform-payments`),
  recordPlatformPayment:(schoolDbId, data)       => api.post(`/api/owner/schools/${schoolDbId}/platform-payments`, data),
  getFeeSummary:    (schoolDbId)             => api.get(`/api/owner/schools/${schoolDbId}/fee-summary`),
};

// ============================================
// ISSUE REPORT APIs
// ============================================

export const issueAPI = {
  // Any authenticated user: submit an issue
  report: (data) => api.post('/api/issues', data),

  // APPLICATION_OWNER: manage issues
  getAll:        (status) => api.get('/api/issues', { params: status ? { status } : {} }),
  updateIssue:   (id, data) => api.patch(`/api/issues/${id}`, data),
  deleteIssue:   (id) => api.delete(`/api/issues/${id}`),
};

// ============================================
// ONLINE EXAM APIs
// ============================================

export const onlineExamTeacherAPI = {
  // Exam CRUD
  createExam:      (data)           => api.post('/api/teacher/online-exams', data),
  listExams:       ()               => api.get('/api/teacher/online-exams'),
  getExam:         (id)             => api.get(`/api/teacher/online-exams/${id}`),
  updateExam:      (id, data)       => api.put(`/api/teacher/online-exams/${id}`, data),
  deleteExam:      (id)             => api.delete(`/api/teacher/online-exams/${id}`),

  // Questions
  addQuestion:     (id, data)       => api.post(`/api/teacher/online-exams/${id}/questions`, data),
  updateQuestion:  (id, qId, data)  => api.put(`/api/teacher/online-exams/${id}/questions/${qId}`, data),
  deleteQuestion:  (id, qId)        => api.delete(`/api/teacher/online-exams/${id}/questions/${qId}`),

  // Lifecycle
  publishExam:     (id)             => api.post(`/api/teacher/online-exams/${id}/publish`),
  closeExam:       (id)             => api.post(`/api/teacher/online-exams/${id}/close`),

  // Results & Grading
  getResults:      (id)             => api.get(`/api/teacher/online-exams/${id}/results`),
  gradeAttempt:    (id, aId, data)  => api.put(`/api/teacher/online-exams/${id}/attempts/${aId}/grade`, data),
};

export const onlineExamStudentAPI = {
  listExams:       ()    => api.get('/api/student/online-exams'),
  getExam:         (id)  => api.get(`/api/student/online-exams/${id}`),
  startExam:       (id)  => api.post(`/api/student/online-exams/${id}/start`),
  saveAnswers:     (id, data) => api.put(`/api/student/online-exams/${id}/save`, data),
  submitExam:      (id)  => api.post(`/api/student/online-exams/${id}/submit`),
  getMyResult:     (id)  => api.get(`/api/student/online-exams/${id}/my-result`),
};

export const onlineExamAdminAPI = {
  listExams:       ()    => api.get('/api/admin/online-exams'),
  getResults:      (id)  => api.get(`/api/admin/online-exams/${id}/results`),
};

// ============================================
export default api;
