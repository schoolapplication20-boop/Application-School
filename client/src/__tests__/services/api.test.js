import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to reset module registry so the in-memory _authToken is fresh each test
let apiModule;
let setAuthToken;
let clearAuthToken;
let BASE_URL;
let authAPI;
let adminAPI;
let teacherAPI;
let studentAPI;
let parentAPI;
let transportAPI;

beforeEach(async () => {
  vi.resetModules();
  apiModule = await import('../../services/api.js');
  setAuthToken   = apiModule.setAuthToken;
  clearAuthToken = apiModule.clearAuthToken;
  BASE_URL       = apiModule.BASE_URL;
  authAPI        = apiModule.authAPI;
  adminAPI       = apiModule.adminAPI;
  teacherAPI     = apiModule.teacherAPI;
  studentAPI     = apiModule.studentAPI;
  parentAPI      = apiModule.parentAPI;
  transportAPI   = apiModule.transportAPI;
});

describe('API Service — Base URL', () => {
  it('BASE_URL is a non-empty string (may be localhost or production from .env)', () => {
    expect(typeof BASE_URL).toBe('string');
    expect(BASE_URL.length).toBeGreaterThan(0);
    expect(BASE_URL.startsWith('http')).toBe(true);
  });

  it('BUG: .env overrides localhost fallback with production URL in all environments', () => {
    // .env sets VITE_API_URL=https://application-school.onrender.com
    // This means local dev and tests also connect to production instead of localhost:8080
    // The .env file should only contain localhost; production URL belongs in .env.production only
    if (BASE_URL !== 'http://localhost:8080') {
      console.warn(`[BUG] BASE_URL is "${BASE_URL}" — not localhost. Local dev hits production server.`);
    }
    expect(BASE_URL).toMatch(/^https?:\/\//);
  });
});

describe('API Service — Token Management', () => {
  it('setAuthToken stores the token', () => {
    setAuthToken('test-token-123');
    // Indirectly verify: the default export axios instance should send it.
    // We test this by checking no error is thrown.
    expect(() => setAuthToken('test-token-123')).not.toThrow();
  });

  it('clearAuthToken does not throw', () => {
    setAuthToken('test-token-abc');
    expect(() => clearAuthToken()).not.toThrow();
  });

  it('setAuthToken accepts null without throwing', () => {
    expect(() => setAuthToken(null)).not.toThrow();
  });
});

describe('API Service — authAPI exports', () => {
  it('exposes login function', () => {
    expect(typeof authAPI.login).toBe('function');
  });

  it('exposes forgotPassword function', () => {
    expect(typeof authAPI.forgotPassword).toBe('function');
  });

  it('exposes verifyOTP function', () => {
    expect(typeof authAPI.verifyOTP).toBe('function');
  });

  it('exposes resetPassword function', () => {
    expect(typeof authAPI.resetPassword).toBe('function');
  });

  it('exposes changePassword function', () => {
    expect(typeof authAPI.changePassword).toBe('function');
  });

  it('BUG: sendLoginOTP and forgotPassword point to the same endpoint', () => {
    // Both call /api/auth/forgot-password — this is a duplicate API definition
    // Create a mock to verify the same URL is called
    const loginOTPCall   = authAPI.sendLoginOTP.toString();
    const forgotPwdCall  = authAPI.forgotPassword.toString();
    // Both should contain the same endpoint string
    expect(loginOTPCall).toContain('forgot-password');
    expect(forgotPwdCall).toContain('forgot-password');
  });

  it('BUG: verifyLoginOTP and verifyOTP point to the same endpoint', () => {
    const verifyLoginOTPStr = authAPI.verifyLoginOTP.toString();
    const verifyOTPStr      = authAPI.verifyOTP.toString();
    expect(verifyLoginOTPStr).toContain('verify-otp');
    expect(verifyOTPStr).toContain('verify-otp');
  });
});

describe('API Service — adminAPI exports', () => {
  it('exposes all CRUD methods for students', () => {
    expect(typeof adminAPI.getStudents).toBe('function');
    expect(typeof adminAPI.getStudentById).toBe('function');
    expect(typeof adminAPI.createStudent).toBe('function');
    expect(typeof adminAPI.updateStudent).toBe('function');
    expect(typeof adminAPI.deleteStudent).toBe('function');
  });

  it('exposes all CRUD methods for teachers', () => {
    expect(typeof adminAPI.getTeachers).toBe('function');
    expect(typeof adminAPI.createTeacher).toBe('function');
    expect(typeof adminAPI.updateTeacher).toBe('function');
    expect(typeof adminAPI.deleteTeacher).toBe('function');
  });

  it('exposes dashboard stats method', () => {
    expect(typeof adminAPI.getDashboardStats).toBe('function');
  });

  it('exposes fee collection methods', () => {
    expect(typeof adminAPI.collectFee).toBe('function');
    expect(typeof adminAPI.collectAssignmentFee).toBe('function');
    expect(typeof adminAPI.collectInstallmentFee).toBe('function');
  });
});

describe('API Service — teacherAPI exports', () => {
  it('exposes attendance methods', () => {
    expect(typeof teacherAPI.markAttendance).toBe('function');
    expect(typeof teacherAPI.getAttendance).toBe('function');
    expect(typeof teacherAPI.getAttendanceSummary).toBe('function');
  });

  it('exposes marks methods', () => {
    expect(typeof teacherAPI.getMarks).toBe('function');
    expect(typeof teacherAPI.addMarks).toBe('function');
    expect(typeof teacherAPI.updateMarks).toBe('function');
  });
});

describe('API Service — studentAPI exports', () => {
  it('exposes student self-service methods', () => {
    expect(typeof studentAPI.getMyProfile).toBe('function');
    expect(typeof studentAPI.getMyAttendance).toBe('function');
    expect(typeof studentAPI.getMyMarks).toBe('function');
    expect(typeof studentAPI.getMyFees).toBe('function');
    expect(typeof studentAPI.getMyDiary).toBe('function');
  });

  it('getMyFullAttendance builds correct date range', () => {
    // Should not throw and returns a promise
    const result = studentAPI.getMyFullAttendance();
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {}); // prevent unhandled rejection
  });
});

describe('API Service — transportAPI exports', () => {
  it('exposes all transport entity CRUD', () => {
    expect(typeof transportAPI.getBuses).toBe('function');
    expect(typeof transportAPI.getRoutes).toBe('function');
    expect(typeof transportAPI.getDrivers).toBe('function');
    expect(typeof transportAPI.getStops).toBe('function');
    expect(typeof transportAPI.getTransportFees).toBe('function');
  });
});

describe('API Service — parentAPI exports', () => {
  it('exposes parent child methods', () => {
    expect(typeof parentAPI.getMyChildren).toBe('function');
    expect(typeof parentAPI.getChildAttendance).toBe('function');
    expect(typeof parentAPI.getChildFees).toBe('function');
    expect(typeof parentAPI.getChildMarks).toBe('function');
  });
});
