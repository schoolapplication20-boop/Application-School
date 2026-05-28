/**
 * Test credentials for the permanent "My Skoolz" test school (ID: 9999).
 *
 * Run tests/seed/seed.mjs once against the live backend to create this school.
 * All defaults below are the fixed passwords set by the seeder.
 *
 * Override via environment variables when pointing at a different environment:
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
    email:    process.env.OWNER_EMAIL || 'owner@myskoolz.com',
    password: process.env.OWNER_PASS  || 'Owner@123',
  },
  superAdmin: {
    email:    process.env.SUPERADMIN_EMAIL || 'superadmin@myskoolz.test',
    password: process.env.SUPERADMIN_PASS  || 'Skoolz@SuperAdmin1',
  },
  admin: {
    email:    process.env.ADMIN_EMAIL || 'admin@myskoolz.test',
    password: process.env.ADMIN_PASS  || 'Skoolz@Admin1',
  },
  teacher: {
    email:    process.env.TEACHER_EMAIL || 'teacher1@myskoolz.test',
    password: process.env.TEACHER_PASS  || 'Skoolz@Teacher1',
  },
  student: {
    admissionNo: process.env.STUDENT_ADMISSION || 'MSZ001',
    password:    process.env.STUDENT_PASS      || 'Skoolz@Student1',
  },
};

/** Unique suffix so parallel runs or re-runs don't collide on created names */
export const RUN_ID = Date.now().toString().slice(-6);
