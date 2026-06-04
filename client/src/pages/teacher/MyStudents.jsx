import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { teacherAPI } from '../../services/api';
import { sortClasses } from '../../utils/classOrder';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const DEFAULT_PW = (rollNumber) => `${rollNumber}@123`;

export default function MyStudents() {
  const [classes,       setClasses]       = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students,      setStudents]      = useState([]);
  const [loadingClass,  setLoadingClass]  = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search,        setSearch]        = useState('');

  // Reset password modal state
  const [resetTarget,   setResetTarget]   = useState(null);
  const [newPassword,   setNewPassword]   = useState('');
  const [resetting,     setResetting]     = useState(false);
  const [resetSuccess,  setResetSuccess]  = useState(false);

  // Onboard student modal state
  const [onboardTarget, setOnboardTarget] = useState(null);
  const [onboardEmail,  setOnboardEmail]  = useState('');
  const [onboarding,    setOnboarding]    = useState(false);
  const [onboardResult, setOnboardResult] = useState(null);

  const loadClasses = useCallback(async () => {
    setLoadingClass(true);
    try {
      const res = await teacherAPI.getMyClasses();
      const list = res.data?.data ?? [];
      setClasses(list.slice().sort(sortClasses));
      if (list.length > 0) setSelectedClass(list[0]);
    } catch { setClasses([]); }
    finally  { setLoadingClass(false); }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoadingStudents(true);
    setStudents([]);
    teacherAPI.getClassStudents(selectedClass.id)
      .then(res => setStudents(res.data?.data ?? []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  const openReset = (student) => {
    setResetTarget(student);
    setNewPassword(DEFAULT_PW(student.rollNumber));
    setResetSuccess(false);
  };

  const closeReset = () => {
    setResetTarget(null);
    setNewPassword('');
    setResetting(false);
    setResetSuccess(false);
  };

  const handleReset = async () => {
    if (!newPassword.trim() || !resetTarget) return;
    setResetting(true);
    try {
      await teacherAPI.resetStudentPassword(resetTarget.id, newPassword.trim());
      setResetSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to reset password.');
    } finally { setResetting(false); }
  };

  const handleOnboard = async () => {
    if (!onboardEmail.trim() || !onboardTarget) return;
    setOnboarding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/teacher/students/${onboardTarget.id}/onboard`,
        { email: onboardEmail.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOnboardResult(res.data?.data || { studentTempPassword: '(check email)' });
      // Refresh list so the "Onboard" button changes to "Reset Password"
      const cls = selectedClass;
      setStudents([]);
      teacherAPI.getClassStudents(cls.id).then(r => setStudents(r.data?.data ?? []));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create account.');
    } finally { setOnboarding(false); }
  };

  const filtered = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) ||
           (s.rollNumber || '').toLowerCase().includes(q);
  });

  const classLabel = (cls) =>
    cls.name + (cls.section ? ` - ${cls.section}` : '');

  return (
    <Layout pageTitle="My Students">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a202c' }}>My Students</h1>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: 13 }}>
            View your class students and reset login passwords
          </p>
        </div>

        {/* Class selector */}
        {classes.length > 1 && (
          <select
            value={selectedClass?.id ?? ''}
            onChange={e => setSelectedClass(classes.find(c => c.id === Number(e.target.value)))}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#2d3748' }}
          >
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{classLabel(cls)}</option>
            ))}
          </select>
        )}
      </div>

      <div className="data-table-card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ color: '#3182ce', fontSize: 20 }}>group</span>
            {selectedClass ? classLabel(selectedClass) : 'Students'}
            {!loadingStudents && (
              <span style={{ background: '#3182ce18', color: '#2c5282', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {filtered.length} student{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '6px 12px', border: '1.5px solid #e2e8f0' }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#a0aec0' }}>search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or roll no…"
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', width: 180, color: '#2d3748' }}
            />
          </div>
        </div>

        {loadingClass || loadingStudents ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
            Loading…
          </div>
        ) : classes.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12, color: '#e2e8f0' }}>class</span>
            You are not assigned to any class yet.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
            {search ? 'No students match your search.' : 'No students found in this class.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Parent Mobile</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#2d3748' }}>
                        {s.rollNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                    <td style={{ fontSize: 12, color: '#718096' }}>
                      {s.className}{s.section ? ` - ${s.section}` : ''}
                    </td>
                    <td style={{ fontSize: 12, color: '#718096' }}>
                      {s.parentMobile || s.motherMobile || '—'}
                    </td>
                    <td>
                      {s.studentUserId ? (
                        <button
                          onClick={() => openReset(s)}
                          title="Reset login password"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', border: 'none', borderRadius: 8,
                            background: '#eff6ff', color: '#2563eb',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: 14 }}>lock_reset</span>
                          Reset Password
                        </button>
                      ) : (
                        <button
                          onClick={() => { setOnboardTarget(s); setOnboardEmail(''); setOnboardResult(null); }}
                          title="Create login account for this student"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', border: 'none', borderRadius: 8,
                            background: '#f0fff4', color: '#276749',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: 14 }}>person_add</span>
                          Onboard
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reset Password Modal ─────────────────────────────────────────── */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

            {resetSuccess ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span className="material-icons" style={{ fontSize: 30, color: '#38a169' }}>check_circle</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#1a202c', marginBottom: 8 }}>Password Reset!</div>
                <p style={{ color: '#718096', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>
                  Password for <strong>{resetTarget.name}</strong> has been reset to:
                </p>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#2d3748', letterSpacing: 1, marginBottom: 12 }}>
                  {newPassword}
                </div>
                <p style={{ color: '#a0aec0', fontSize: 11, margin: '0 0 20px' }}>
                  Student will be asked to change this password on next login.
                </p>
                <button onClick={closeReset} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-icons" style={{ color: '#2563eb', fontSize: 22 }}>lock_reset</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1a202c' }}>Reset Password</div>
                    <div style={{ fontSize: 12, color: '#718096' }}>
                      {resetTarget.name} · Roll {resetTarget.rollNumber}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 6 }}>New Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    autoFocus
                  />
                  <button
                    onClick={() => setNewPassword(DEFAULT_PW(resetTarget.rollNumber))}
                    style={{ marginTop: 6, fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    ↺ Use default ({DEFAULT_PW(resetTarget.rollNumber)})
                  </button>
                </div>

                <p style={{ fontSize: 11, color: '#a0aec0', margin: '0 0 20px', lineHeight: 1.5 }}>
                  The student will be required to change this password when they next log in.
                </p>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={closeReset} disabled={resetting} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetting || !newPassword.trim()}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {resetting ? (
                      <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Resetting…</>
                    ) : (
                      <><span className="material-icons" style={{ fontSize: 16 }}>lock_reset</span> Reset Password</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Onboard Student Modal ────────────────────────────────────────── */}
      {onboardTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {onboardResult ? (
              <div style={{ textAlign: 'center' }}>
                <span className="material-icons" style={{ fontSize: 50, color: '#38a169' }}>how_to_reg</span>
                <h3 style={{ marginTop: 12 }}>Account Created!</h3>
                <p style={{ color: '#718096', fontSize: 13 }}>
                  Login credentials for <strong>{onboardTarget.name}</strong>:
                </p>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 12, textAlign: 'left', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#718096' }}>Email: <strong>{onboardEmail}</strong></div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Temp Password: <strong style={{ fontFamily: 'monospace' }}>{onboardResult.studentTempPassword}</strong></div>
                </div>
                <p style={{ fontSize: 11, color: '#a0aec0', marginBottom: 20 }}>Student will change this password on first login. A welcome email has been sent.</p>
                <button onClick={() => setOnboardTarget(null)} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#276749', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-icons" style={{ color: '#276749', fontSize: 22 }}>person_add</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Create Account</div>
                    <div style={{ fontSize: 12, color: '#718096' }}>{onboardTarget.name} · Roll {onboardTarget.rollNumber}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 6 }}>Student Email Address</label>
                  <input
                    type="email"
                    value={onboardEmail}
                    onChange={e => setOnboardEmail(e.target.value)}
                    placeholder="student@email.com"
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    autoFocus
                  />
                  <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 6 }}>A welcome email with login credentials will be sent to this address.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setOnboardTarget(null)} disabled={onboarding} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleOnboard} disabled={onboarding || !onboardEmail.trim()} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#276749', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: onboarding ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {onboarding ? 'Creating…' : <><span className="material-icons" style={{ fontSize: 16 }}>person_add</span> Create Account</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
