#!/usr/bin/env node
/**
 * My Skoolz Test School Seeder
 *
 * Creates a permanent test school (School ID 9999, name "My Skoolz") with
 * fixed credentials for all roles so E2E tests have stable accounts to use.
 *
 * Run once against the live backend:
 *   OWNER_EMAIL=owner@... OWNER_PASS=... node tests/seed/seed.mjs
 *
 * Optional env vars:
 *   API_URL              Backend base URL (default: http://localhost:8080)
 *   OWNER_EMAIL          Application owner email  (REQUIRED)
 *   OWNER_PASS           Application owner password (REQUIRED)
 *   SA_CURRENT_PASS      If the super admin was already created and you
 *                        need to skip creation, set its current password here
 *   ADMIN_CURRENT_PASS   Same for the admin account
 */

const API          = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
const OWNER_EMAIL  = process.env.OWNER_EMAIL;
const OWNER_PASS   = process.env.OWNER_PASS;

if (!OWNER_EMAIL || !OWNER_PASS) {
  console.error('\nERROR: Set OWNER_EMAIL and OWNER_PASS before running.\n');
  process.exit(1);
}

// ── Fixed test data ────────────────────────────────────────────────────────

const SCHOOL = {
  schoolId:     9999,
  name:         'My Skoolz',
  code:         'MYSKOOLZ',
  board:        'CBSE',
  academicYear: '2025-2026',
  city:         'Hyderabad',
  state:        'Telangana',
  country:      'India',
  phone:        '9000000001',
  email:        'info@myskoolz.test',
};

const SUPER_ADMIN = {
  name:     'My Skoolz Super Admin',
  email:    'superadmin@myskoolz.test',
  mobile:   '9000000002',
  password: 'Skoolz@SuperAdmin1',
};

const ADMIN = {
  name:     'My Skoolz Admin',
  email:    'admin@myskoolz.test',
  mobile:   '9000000003',
  password: 'Skoolz@Admin1',
};

const TEACHERS = [
  {
    name: 'Priya Sharma', email: 'teacher1@myskoolz.test', mobile: '9000000004',
    empId: 'MSZ-T001', subject: 'Mathematics', teacherType: 'SUBJECT_TEACHER',
    seedTempPassword: 'SeedTemp@T1',   // admin-set temp; changed below
    password: 'Skoolz@Teacher1',
  },
  {
    name: 'Ravi Kumar', email: 'teacher2@myskoolz.test', mobile: '9000000005',
    empId: 'MSZ-T002', subject: 'Science', teacherType: 'SUBJECT_TEACHER',
    seedTempPassword: 'SeedTemp@T2',
    password: 'Skoolz@Teacher2',
  },
];

const CLASSES = [
  { name: 'Class 1', section: 'A' },
  { name: 'Class 2', section: 'A' },
  { name: 'Class 3', section: 'A' },
  { name: 'Class 4', section: 'A' },
  { name: 'Class 5', section: 'A' },
];

const STUDENTS = [
  {
    name: 'Arjun Singh',   rollNumber: '1', admissionNumber: 'MSZ001',
    className: 'Class 5', section: 'A',
    parentName: 'Rakesh Singh',   parentMobile: '9111000001',
    motherName: 'Sunita Singh',   motherMobile: '9111000002',
    address: '12 MG Road, Hyderabad',
    password: 'Skoolz@Student1',
  },
  {
    name: 'Divya Reddy',   rollNumber: '2', admissionNumber: 'MSZ002',
    className: 'Class 5', section: 'A',
    parentName: 'Suresh Reddy',   parentMobile: '9111000003',
    motherName: 'Lakshmi Reddy',  motherMobile: '9111000004',
    address: '45 SR Nagar, Hyderabad',
    password: 'Skoolz@Student2',
  },
  {
    name: 'Mohammed Aziz', rollNumber: '3', admissionNumber: 'MSZ003',
    className: 'Class 5', section: 'A',
    parentName: 'Ibrahim Aziz',   parentMobile: '9111000005',
    motherName: 'Fatima Aziz',    motherMobile: '9111000006',
    address: '78 Banjara Hills, Hyderabad',
    password: 'Skoolz@Student3',
  },
];

// ── HTTP helpers ───────────────────────────────────────────────────────────

import readline from 'readline';

async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, ...(JSON.parse(text)) }; }
  catch { return { status: res.status, success: false, message: text }; }
}

function ok(msg)   { console.log(`  ✓ ${msg}`); }
function skip(msg) { console.log(`  ⚠ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); }

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function login(email, password, role) {
  const res = await post('/api/auth/login', { email, password, selectedRole: role });

  // APPLICATION_OWNER requires OTP 2FA — prompt for it interactively
  if (res.data?.otpRequired) {
    console.log(`\n  ⚡ OTP sent to the authorized security email for ${email}`);
    const otp = await prompt('  Enter the 6-digit OTP: ');
    const otpRes = await post('/api/auth/verify-owner-otp', { email, otp });
    const token = otpRes.data?.token;
    if (!token) throw new Error(`OTP verification failed: ${otpRes.message || JSON.stringify(otpRes)}`);
    return token;
  }

  const token = res.data?.token;
  if (!token) throw new Error(`Login failed for ${email}: ${res.message || JSON.stringify(res)}`);
  return token;
}

async function changePassword(token, currentPassword, newPassword) {
  const res = await post('/api/auth/change-password', { currentPassword, newPassword }, token);
  if (!res.success) throw new Error(`changePassword failed: ${res.message}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║    My Skoolz Test School Seeder (ID: 9999)         ║');
  console.log(`║    Backend: ${API.padEnd(38)}║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  // ── Step 1: App owner login ──────────────────────────────────────────────
  console.log('▶ Step 1: App owner login');
  const ownerToken = await login(OWNER_EMAIL, OWNER_PASS, 'APPLICATION_OWNER');
  ok('App owner authenticated');

  // ── Step 2: Create super admin + school 9999 ─────────────────────────────
  console.log('\n▶ Step 2: Create super admin + school (ID 9999)');
  let saGenPassword = process.env.SA_CURRENT_PASS;

  if (!saGenPassword) {
    const saRes = await post('/api/superadmin/super-admins', {
      name:       SUPER_ADMIN.name,
      email:      SUPER_ADMIN.email,
      mobile:     SUPER_ADMIN.mobile,
      schoolName: SCHOOL.name,
      schoolCode: SCHOOL.code,
      schoolId:   SCHOOL.schoolId,
    }, ownerToken);

    if (saRes.success) {
      saGenPassword = saRes.data?.generatedPassword;
      ok(`Super admin created — temp password: ${saGenPassword}`);
    } else if (saRes.message?.toLowerCase().includes('exist') ||
               saRes.message?.toLowerCase().includes('duplicate')) {
      skip('Super admin / school already exists — set SA_CURRENT_PASS to continue');
      process.exit(0);
    } else {
      fail(`Super admin creation failed: ${saRes.message}`);
      process.exit(1);
    }
  } else {
    skip(`Skipping creation — using SA_CURRENT_PASS`);
  }

  // ── Step 3: Super admin sets permanent password ───────────────────────────
  console.log('\n▶ Step 3: Super admin — set permanent password');
  const saTokenTemp = await login(SUPER_ADMIN.email, saGenPassword, 'SUPER_ADMIN');
  await changePassword(saTokenTemp, saGenPassword, SUPER_ADMIN.password);
  ok(`Password set → ${SUPER_ADMIN.password}`);

  const saToken = await login(SUPER_ADMIN.email, SUPER_ADMIN.password, 'SUPER_ADMIN');
  ok('Super admin re-authenticated');

  // ── Step 4: Create admin ──────────────────────────────────────────────────
  console.log('\n▶ Step 4: Create admin');
  let adminGenPassword = process.env.ADMIN_CURRENT_PASS;

  if (!adminGenPassword) {
    const adminRes = await post('/api/superadmin/admins', {
      name:   ADMIN.name,
      email:  ADMIN.email,
      mobile: ADMIN.mobile,
    }, saToken);

    if (adminRes.success) {
      adminGenPassword = adminRes.data?.generatedPassword;
      ok(`Admin created — temp password: ${adminGenPassword}`);
    } else if (adminRes.message?.toLowerCase().includes('exist') ||
               adminRes.message?.toLowerCase().includes('duplicate')) {
      skip('Admin already exists — set ADMIN_CURRENT_PASS to continue');
      process.exit(0);
    } else {
      fail(`Admin creation failed: ${adminRes.message}`);
      process.exit(1);
    }
  } else {
    skip(`Skipping creation — using ADMIN_CURRENT_PASS`);
  }

  // ── Step 5: Admin sets permanent password ─────────────────────────────────
  console.log('\n▶ Step 5: Admin — set permanent password');
  const adminTokenTemp = await login(ADMIN.email, adminGenPassword, 'ADMIN');
  await changePassword(adminTokenTemp, adminGenPassword, ADMIN.password);
  ok(`Password set → ${ADMIN.password}`);

  const adminToken = await login(ADMIN.email, ADMIN.password, 'ADMIN');
  ok('Admin re-authenticated');

  // ── Step 6: Create classes ────────────────────────────────────────────────
  console.log('\n▶ Step 6: Create classes');
  for (const cls of CLASSES) {
    const r = await post('/api/admin/classes', { name: cls.name, section: cls.section }, adminToken);
    if (r.success) ok(`${cls.name} – ${cls.section}`);
    else skip(`${cls.name}-${cls.section}: ${r.message}`);
  }

  // ── Step 7: Create teachers ───────────────────────────────────────────────
  console.log('\n▶ Step 7: Create teachers');
  for (const t of TEACHERS) {
    const r = await post('/api/admin/teachers', {
      name:        t.name,
      email:       t.email,
      mobile:      t.mobile,
      empId:       t.empId,
      subject:     t.subject,
      teacherType: t.teacherType,
      password:    t.seedTempPassword,   // admin sets temp; we'll change below
    }, adminToken);

    if (r.success) {
      ok(`Created: ${t.name} (${t.email})`);
      // Clear firstLogin by changing to the real password
      try {
        const tTok = await login(t.email, t.seedTempPassword, 'TEACHER');
        await changePassword(tTok, t.seedTempPassword, t.password);
        ok(`  Password set → ${t.password}`);
      } catch (e) {
        skip(`  Could not set teacher password: ${e.message}`);
      }
    } else {
      skip(`${t.email}: ${r.message}`);
    }
  }

  // ── Step 8: Create students ───────────────────────────────────────────────
  console.log('\n▶ Step 8: Create students');
  const finalStudents = [];

  for (const s of STUDENTS) {
    const r = await post('/api/admin/students', {
      name:            s.name,
      rollNumber:      s.rollNumber,
      admissionNumber: s.admissionNumber,
      className:       s.className,
      section:         s.section,
      parentName:      s.parentName,
      parentMobile:    s.parentMobile,
      motherName:      s.motherName,
      motherMobile:    s.motherMobile,
      address:         s.address,
    }, adminToken);

    if (r.success) {
      const admNo  = r.data?.student?.admissionNumber || s.admissionNumber;
      const tmpPwd = r.data?.studentTempPassword;
      ok(`Created: ${s.name}  admission: ${admNo}  temp pwd: ${tmpPwd}`);
      finalStudents.push({ ...s, admissionNumber: admNo });

      // Change to fixed password so firstLogin is cleared
      if (tmpPwd) {
        try {
          const sTok = await login(admNo, tmpPwd, 'STUDENT');
          await changePassword(sTok, tmpPwd, s.password);
          ok(`  Password set → ${s.password}`);
        } catch (e) {
          skip(`  Could not set student password: ${e.message}`);
        }
      }
    } else {
      skip(`${s.name}: ${r.message}`);
    }
  }

  // ── Final credentials summary ──────────────────────────────────────────────
  const line = '═'.repeat(68);
  console.log(`\n╔${line}╗`);
  console.log(`║${'  TEST CREDENTIALS — MY SKOOLZ (ID 9999)'.padEnd(68)}║`);
  console.log(`╠${line}╣`);
  console.log(`║${'  Backend: ' + API}`.padEnd(69) + '║');
  console.log(`╠${line}╣`);
  console.log(`║  SUPER ADMIN   email    : ${SUPER_ADMIN.email}`.padEnd(69) + '║');
  console.log(`║                password : ${SUPER_ADMIN.password}`.padEnd(69) + '║');
  console.log(`╠${line}╣`);
  console.log(`║  ADMIN         email    : ${ADMIN.email}`.padEnd(69) + '║');
  console.log(`║                password : ${ADMIN.password}`.padEnd(69) + '║');
  console.log(`╠${line}╣`);
  for (const t of TEACHERS) {
    console.log(`║  TEACHER       email    : ${t.email}`.padEnd(69) + '║');
    console.log(`║                password : ${t.password}`.padEnd(69) + '║');
  }
  console.log(`╠${line}╣`);
  for (const s of finalStudents) {
    console.log(`║  STUDENT       admission: ${s.admissionNumber}`.padEnd(69) + '║');
    console.log(`║                password : ${s.password}`.padEnd(69) + '║');
  }
  console.log(`╚${line}╝\n`);
  console.log('All done. Update tests/.env with these credentials and run npm run test:e2e\n');
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
