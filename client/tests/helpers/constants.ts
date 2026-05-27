/**
 * Test credentials and shared constants.
 *
 * Override via environment variables when running against a real environment:
 *   OWNER_EMAIL / OWNER_PASS
 *   SUPERADMIN_EMAIL / SUPERADMIN_PASS
 *   ADMIN_EMAIL / ADMIN_PASS
 *   TEACHER_EMAIL / TEACHER_PASS
 *   STUDENT_ADMISSION / STUDENT_PASS
 */

export const API_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:8080';

export const CREDENTIALS = {
  owner: {
    email:    process.env.OWNER_EMAIL    || 'owner@myskoolz.com',
    password: process.env.OWNER_PASS     || 'Owner@123',
  },
  superAdmin: {
    email:    process.env.SUPERADMIN_EMAIL || 'superadmin@testschool.com',
    password: process.env.SUPERADMIN_PASS  || 'SuperAdmin@123',
  },
  admin: {
    email:    process.env.ADMIN_EMAIL    || 'admin@testschool.com',
    password: process.env.ADMIN_PASS     || 'Admin@123',
  },
  teacher: {
    email:    process.env.TEACHER_EMAIL  || 'teacher@testschool.com',
    password: process.env.TEACHER_PASS   || 'Teacher@123',
  },
  student: {
    admissionNo: process.env.STUDENT_ADMISSION || 'S001',
    password:    process.env.STUDENT_PASS      || 'Student@123',
  },
};

/** Unique suffix so parallel runs or re-runs don't collide on names */
export const RUN_ID = Date.now().toString().slice(-6);

export const TEST_CLASS   = 'Class 7';
export const TEST_SECTION = 'A';
