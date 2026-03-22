import axios from 'axios';

// Base URL for the Spring Boot backend
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('schoolers_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401) {
      // Token expired - clear storage and redirect to login
      localStorage.removeItem('schoolers_token');
      localStorage.removeItem('schoolers_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH APIs
// ============================================

export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  verifyOTP: (data) => api.post('/api/auth/verify-otp', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  changePassword: (data) => api.post('/api/auth/change-password', data),
};

// ============================================
// ADMIN APIs
// ============================================

export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/api/admin/dashboard/stats'),
  getRevenueChart: (period) => api.get(`/api/admin/dashboard/revenue?period=${period}`),
  getAttendanceChart: (period) => api.get(`/api/admin/dashboard/attendance?period=${period}`),

  // Students
  getStudents: (params) => api.get('/api/admin/students', { params }),
  getStudentById: (id) => api.get(`/api/admin/students/${id}`),
  createStudent: (data) => api.post('/api/admin/students', data),
  updateStudent: (id, data) => api.put(`/api/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/api/admin/students/${id}`),

  // Teachers
  getTeachers: (params) => api.get('/api/admin/teachers', { params }),
  getTeacherById: (id) => api.get(`/api/admin/teachers/${id}`),
  createTeacher: (data) => api.post('/api/admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/api/admin/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/api/admin/teachers/${id}`),

  // Classes
  getClasses: () => api.get('/api/admin/classes'),
  createClass: (data) => api.post('/api/admin/classes', data),
  updateClass: (id, data) => api.put(`/api/admin/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/api/admin/classes/${id}`),

  // Fees
  getFees: (params) => api.get('/api/admin/fees', { params }),
  createFee: (data) => api.post('/api/admin/fees', data),
  updateFee: (id, data) => api.put(`/api/admin/fees/${id}`, data),

  // Expenses
  getExpenses: (params) => api.get('/api/admin/expenses', { params }),
  createExpense: (data) => api.post('/api/admin/expenses', data),
  updateExpense: (id, data) => api.put(`/api/admin/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/api/admin/expenses/${id}`),
};

// ============================================
// TEACHER APIs
// ============================================

export const teacherAPI = {
  // Classes
  getMyClasses: () => api.get('/api/teacher/classes'),

  // Attendance
  markAttendance: (data) => api.post('/api/teacher/attendance', data),
  getAttendance: (classId, date) => api.get(`/api/teacher/attendance/${classId}?date=${date}`),
  getAttendanceHistory: (params) => api.get('/api/teacher/attendance/history', { params }),

  // Assignments
  getAssignments: () => api.get('/api/teacher/assignments'),
  createAssignment: (data) => api.post('/api/teacher/assignments', data),
  updateAssignment: (id, data) => api.put(`/api/teacher/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/api/teacher/assignments/${id}`),

  // Marks
  getMarks: (studentId) => api.get(`/api/teacher/marks/${studentId}`),
  addMarks: (data) => api.post('/api/teacher/marks', data),
  updateMarks: (id, data) => api.put(`/api/teacher/marks/${id}`, data),
};

// ============================================
// PARENT APIs
// ============================================

export const parentAPI = {
  // Child Info
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

export default api;
