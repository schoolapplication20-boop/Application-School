import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for src/services/api.js
 *
 * Strategy: import the real module and verify its shape and behaviour.
 * Network calls are never made — we rely on module-level state (the token)
 * and structural assertions (are all expected exports present?).
 *
 * The interceptor behaviour (Authorization header attachment) is verified by
 * inspecting the axios instance configuration without making live requests.
 */

// ── import after mocking axios so no real network calls occur ─────────────────
vi.mock('axios', async (importOriginal) => {
  const requestHandlers  = [];
  const responseHandlers = [];

  const mockInstance = {
    interceptors: {
      request:  { use: vi.fn((fn) => requestHandlers.push(fn)) },
      response: { use: vi.fn((fn) => responseHandlers.push(fn)) },
    },
    get:    vi.fn().mockResolvedValue({ data: {} }),
    post:   vi.fn().mockResolvedValue({ data: {} }),
    put:    vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    patch:  vi.fn().mockResolvedValue({ data: {} }),
    // expose internal state for tests
    _requestHandlers:  requestHandlers,
    _responseHandlers: responseHandlers,
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

const {
  default: api,
  BASE_URL,
  setAuthToken,
  clearAuthToken,
  authAPI,
  superAdminAPI,
  adminAPI,
  teacherAPI,
  studentAPI,
  transportAPI,
  calendarAPI,
  reportCardAPI,
  leaveAPI,
  announcementAPI,
  homeworkAPI,
  messageAPI,
  salaryAPI,
  schoolAPI,
  systemAPI,
} = await import('../../services/api.js');

// ─────────────────────────────────────────────────────────────────────────────

describe('api service', () => {

  afterEach(() => {
    clearAuthToken();
  });

  // ── BASE_URL ──────────────────────────────────────────────────────────────

  describe('BASE_URL', () => {
    it('falls back to http://localhost:8080 when VITE_API_URL is not configured', () => {
      // import.meta.env.VITE_API_URL is undefined in the test environment
      expect(BASE_URL).toBe('http://localhost:8080');
    });
  });

  // ── token management ──────────────────────────────────────────────────────

  describe('token management', () => {
    it('setAuthToken attaches Authorization header via the request interceptor', () => {
      setAuthToken('my-jwt-token');

      const handler = api._requestHandlers[0];
      const config  = { headers: {} };
      const result  = handler(config);

      expect(result.headers.Authorization).toBe('Bearer my-jwt-token');
    });

    it('clearAuthToken removes the token so subsequent requests have no Authorization header', () => {
      setAuthToken('my-jwt-token');
      clearAuthToken();

      const handler = api._requestHandlers[0];
      const config  = { headers: {} };
      const result  = handler(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('request without a token sends no Authorization header', () => {
      const handler = api._requestHandlers[0];
      const config  = { headers: {} };
      const result  = handler(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  // ── API surface — authAPI ─────────────────────────────────────────────────

  describe('authAPI', () => {
    const requiredMethods = [
      'login', 'register', 'forgotPassword', 'verifyOTP', 'resetPassword',
      'changePassword', 'setFirstPassword', 'verifyEmail', 'verifyOwnerOtp',
    ];

    it.each(requiredMethods)('exports authAPI.%s as a function', (method) => {
      expect(typeof authAPI[method]).toBe('function');
    });

    it('authAPI.login posts to /api/auth/login', () => {
      const payload = { email: 'a@b.com', password: 'pw' };
      authAPI.login(payload);
      expect(api.post).toHaveBeenCalledWith('/api/auth/login', payload);
    });

    it('authAPI.forgotPassword posts to /api/auth/forgot-password', () => {
      authAPI.forgotPassword({ identifier: 'a@b.com' });
      expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', { identifier: 'a@b.com' });
    });

    it('authAPI.verifyOwnerOtp posts to /api/auth/verify-owner-otp', () => {
      authAPI.verifyOwnerOtp({ email: 'o@app.com', otp: '123456' });
      expect(api.post).toHaveBeenCalledWith('/api/auth/verify-owner-otp',
        { email: 'o@app.com', otp: '123456' });
    });
  });

  // ── API surface — adminAPI ────────────────────────────────────────────────

  describe('adminAPI', () => {
    const requiredMethods = [
      'getDashboardStats', 'getStudents', 'createStudent', 'updateStudent', 'deleteStudent',
      'getTeachers', 'createTeacher', 'updateTeacher', 'deleteTeacher',
      'getClasses', 'createClass', 'updateClass', 'deleteClass',
      'getFees', 'collectFee', 'createFee', 'updateFee', 'deleteFee',
      'getExpenses', 'createExpense', 'updateExpense', 'deleteExpense',
      'getParents', 'createParent', 'updateParent', 'deleteParent',
    ];

    it.each(requiredMethods)('exports adminAPI.%s as a function', (method) => {
      expect(typeof adminAPI[method]).toBe('function');
    });

    it('adminAPI.getStudents GETs /api/admin/students', () => {
      adminAPI.getStudents({});
      expect(api.get).toHaveBeenCalledWith('/api/admin/students', expect.any(Object));
    });

    it('adminAPI.createStudent POSTs to /api/admin/students', () => {
      const data = { name: 'Alice' };
      adminAPI.createStudent(data);
      expect(api.post).toHaveBeenCalledWith('/api/admin/students', data);
    });

    it('adminAPI.deleteStudent DELETEs /api/admin/students/:id', () => {
      adminAPI.deleteStudent(42);
      expect(api.delete).toHaveBeenCalledWith('/api/admin/students/42');
    });

    it('adminAPI.collectFee POSTs to the correct idempotency endpoint', () => {
      adminAPI.collectFee(7, { amount: 500 });
      expect(api.post).toHaveBeenCalledWith('/api/admin/fees/7/collect', { amount: 500 });
    });
  });

  // ── API surface — teacherAPI ──────────────────────────────────────────────

  describe('teacherAPI', () => {
    const requiredMethods = [
      'getMyClasses', 'getClassStudents', 'markAttendance', 'getAttendance',
      'getMarks', 'addMarks', 'updateMarks', 'deleteMarks',
      'getAssignments', 'createAssignment', 'updateAssignment', 'deleteAssignment',
    ];

    it.each(requiredMethods)('exports teacherAPI.%s as a function', (method) => {
      expect(typeof teacherAPI[method]).toBe('function');
    });

    it('teacherAPI.addMarks POSTs to /api/teacher/marks', () => {
      const marks = { studentId: 1, subject: 'Math', marks: 95 };
      teacherAPI.addMarks(marks);
      expect(api.post).toHaveBeenCalledWith('/api/teacher/marks', marks);
    });
  });

  // ── API surface — studentAPI ──────────────────────────────────────────────

  describe('studentAPI', () => {
    const requiredMethods = [
      'getMyProfile', 'getMyAttendance', 'getMyFullAttendance',
      'getMyMarks', 'getMyFees', 'getMyDiary',
    ];

    it.each(requiredMethods)('exports studentAPI.%s as a function', (method) => {
      expect(typeof studentAPI[method]).toBe('function');
    });

    it('studentAPI.getMyProfile GETs /api/student/me', () => {
      studentAPI.getMyProfile();
      expect(api.get).toHaveBeenCalledWith('/api/student/me');
    });
  });

  // ── API surface — transportAPI ────────────────────────────────────────────

  describe('transportAPI', () => {
    it('exports bus, driver, and route CRUD functions', () => {
      ['getBuses', 'createBus', 'updateBus', 'deleteBus',
       'getDrivers', 'createDriver', 'updateDriver', 'deleteDriver',
       'getRoutes', 'createRoute', 'updateRoute', 'deleteRoute'].forEach((m) => {
        expect(typeof transportAPI[m]).toBe('function');
      });
    });
  });

  // ── API surface — calendar, reportCard, leave, school ────────────────────

  describe('calendarAPI', () => {
    it('exports getEvents, createEvent, updateEvent, deleteEvent', () => {
      ['getEvents', 'createEvent', 'updateEvent', 'deleteEvent'].forEach((m) => {
        expect(typeof calendarAPI[m]).toBe('function');
      });
    });
  });

  describe('reportCardAPI', () => {
    it('exports getMyReportCard, getMyFilters, getStudentReportCard', () => {
      expect(typeof reportCardAPI.getMyReportCard).toBe('function');
      expect(typeof reportCardAPI.getMyFilters).toBe('function');
      expect(typeof reportCardAPI.getStudentReportCard).toBe('function');
    });
  });

  describe('leaveAPI', () => {
    it('exports student and teacher leave functions', () => {
      ['getStudentLeaves', 'getTeacherLeaves', 'createLeave', 'updateStatus',
       'submitStudentLeave', 'getMyStudentLeaves'].forEach((m) => {
        expect(typeof leaveAPI[m]).toBe('function');
      });
    });
  });

  describe('systemAPI', () => {
    it('exports getActiveNotice, setNotice, clearNotice', () => {
      expect(typeof systemAPI.getActiveNotice).toBe('function');
      expect(typeof systemAPI.setNotice).toBe('function');
      expect(typeof systemAPI.clearNotice).toBe('function');
    });
  });
});
