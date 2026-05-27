/**
 * Direct API helpers used in test setup/teardown.
 * These bypass the UI for speed — seed data before a test, clean up after.
 */
import { APIRequestContext } from '@playwright/test';
import { API_URL, CREDENTIALS } from './constants';

let _adminToken: string | null = null;

/** Get a cached JWT for the admin role. */
export async function getAdminToken(request: APIRequestContext): Promise<string> {
  if (_adminToken) return _adminToken;

  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email:    CREDENTIALS.admin.email,
      password: CREDENTIALS.admin.password,
      role:     'ADMIN',
    },
  });

  const body = await res.json();
  _adminToken = body.data?.token || body.token;
  if (!_adminToken) throw new Error('Could not obtain admin JWT');
  return _adminToken;
}

/** Reset cached token (call in afterAll if tests mutate credentials). */
export function resetToken() { _adminToken = null; }

/** Create a class via API — faster than UI for prerequisite data. */
export async function apiCreateClass(
  request: APIRequestContext,
  name: string,
  section: string,
) {
  const token = await getAdminToken(request);
  const res = await request.post(`${API_URL}/api/admin/classes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, section, capacity: 40 },
  });
  return await res.json();
}

/** Delete a class by id via API. */
export async function apiDeleteClass(request: APIRequestContext, id: number) {
  const token = await getAdminToken(request);
  await request.delete(`${API_URL}/api/admin/classes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Create a student via API. Returns the created student object. */
export async function apiCreateStudent(
  request: APIRequestContext,
  data: Record<string, unknown>,
) {
  const token = await getAdminToken(request);
  const res = await request.post(`${API_URL}/api/admin/students`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  return await res.json();
}

/** Delete a student by id via API. */
export async function apiDeleteStudent(request: APIRequestContext, id: number) {
  const token = await getAdminToken(request);
  await request.delete(`${API_URL}/api/admin/students/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
