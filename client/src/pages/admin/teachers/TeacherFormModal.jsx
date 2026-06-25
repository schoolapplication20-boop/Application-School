import React from 'react';
import { Field, Col2, Section } from './FormControls';
import ClassPicker from './ClassPicker';
import SubjectTagInput from './SubjectTagInput';
import { inputStyle, errStyle } from './constants';
import { generateRandomPassword } from '../../../utils/passwordGenerator';

export default function TeacherFormModal({
  editTeacher, form, setForm, errors, setErrors, saving, classList,
  teacherOtp, setTeacherOtp, onSendOtp, onVerifyOtp, onResetOtp, onClose, onSubmit,
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <span className="modal-title">{editTeacher ? 'Edit Teacher' : 'Add New Teacher'}</span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>

            {/* Login password — only when adding */}
            {!editTeacher && (
              <div style={{ marginBottom: 4 }}>
                <Field label="Initial Login Password" required error={errors.password}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        style={{ ...inputStyle(errors.password) }}
                        placeholder="Set a password the teacher will use"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                    <button type="button"
                      onClick={() => { const p = generateRandomPassword(); setForm(f => ({ ...f, password: p })); }}
                      title="Generate a secure password"
                      style={{ flexShrink: 0, padding: '8px 12px', background: '#0de1e815', border: '1.5px solid #0de1e840', borderRadius: 8, cursor: 'pointer', color: '#276749', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                      <span className="material-icons" style={{ fontSize: 15 }}>autorenew</span>
                      Generate
                    </button>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                    This password is shown in the credentials popup after saving — copy and share it with the teacher.
                  </p>
                </Field>
              </div>
            )}

            {/* ── Personal Info ────────────────────────────────────── */}
            <Section icon="person" label="Personal Information" />
            <Col2>
              <Field label="Full Name" required error={errors.name}>
                <input style={inputStyle(errors.name)} placeholder="e.g., Priya Sharma" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Employee ID (Optional)" error={errors.empId}>
                <input
                  style={inputStyle(errors.empId)}
                  placeholder="e.g., T009 — leave blank to auto-generate"
                  value={form.empId}
                  onChange={e => setForm({ ...form, empId: e.target.value.trim() })}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {form.empId.trim()
                    ? 'Must be unique within this school.'
                    : 'Leave blank — a unique ID will be generated automatically.'}
                </p>
              </Field>
              <Field label="Email (Login ID)" required error={errors.email || (!editTeacher && teacherOtp.error)}>
                {editTeacher ? (
                  <input type="email" style={inputStyle(errors.email)} placeholder="teacher@school.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value.replace(/\s/g, '') })} />
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="email"
                        style={{ ...inputStyle(errors.email), flex: 1 }}
                        placeholder="teacher@school.com"
                        value={form.email}
                        onChange={e => { setForm({ ...form, email: e.target.value.replace(/\s/g, '') }); onResetOtp(); }}
                      />
                      {!teacherOtp.verified && (
                        <button type="button" onClick={onSendOtp} disabled={teacherOtp.sending}
                          style={{ flexShrink: 0, padding: '8px 14px', background: teacherOtp.sending ? '#a0aec0' : '#0369a1', border: 'none', borderRadius: 8, cursor: teacherOtp.sending ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap' }}>
                          {teacherOtp.sending ? 'Sending…' : teacherOtp.sent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                      )}
                      {teacherOtp.verified && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#276749', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                          <span className="material-icons" style={{ fontSize: 18, color: '#38a169' }}>verified</span>
                          Verified
                        </span>
                      )}
                    </div>
                    {teacherOtp.sent && !teacherOtp.verified && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={teacherOtp.value}
                          onChange={e => setTeacherOtp(s => ({ ...s, value: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))}
                          style={{ ...inputStyle(false), flex: 1, letterSpacing: 4, fontWeight: 700 }}
                        />
                        <button type="button" onClick={onVerifyOtp} disabled={teacherOtp.verifying}
                          style={{ flexShrink: 0, padding: '8px 14px', background: '#276749', border: 'none', borderRadius: 8, cursor: teacherOtp.verifying ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap' }}>
                          {teacherOtp.verifying ? 'Verifying…' : 'Verify'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Field>
              <Field label="Mobile Number" required error={errors.mobile}>
                <input type="tel" style={inputStyle(errors.mobile)} placeholder="10-digit mobile" maxLength={10} value={form.mobile}
                  onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              </Field>
            </Col2>

            {/* ── Professional Info ────────────────────────────────── */}
            <Section icon="school" label="Professional Details" />
            <Col2>
              <Field label="Subjects" required error={errors.subject}>
                <SubjectTagInput
                  value={form.subject}
                  onChange={v => setForm({ ...form, subject: v })}
                  hasError={!!errors.subject}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  Type a subject and press Enter or , to add. Multiple subjects allowed.
                </p>
              </Field>
              <Field label="Department" optional>
                <input style={inputStyle(false)} placeholder="e.g., Science Department" value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })} />
              </Field>
              <Field label="Qualification" optional>
                <input style={inputStyle(false)} placeholder="e.g., M.Sc Mathematics" value={form.qualification}
                  onChange={e => setForm({ ...form, qualification: e.target.value })} />
              </Field>
              <Field label="Experience" optional>
                <input style={inputStyle(false)} placeholder="e.g., 5 years" value={form.experience}
                  onChange={e => setForm({ ...form, experience: e.target.value })} />
              </Field>
              <Field label="Joining Date" optional>
                <input type="date" style={inputStyle(false)} value={form.joining}
                  onChange={e => setForm({ ...form, joining: e.target.value })} />
              </Field>
              <Field label="Status">
                <select style={{ ...inputStyle(false), cursor: 'pointer' }} value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </Col2>

            {/* ── Teacher Role & Class Assignment ──────────────────── */}
            <Section icon="class" label="Role & Class Assignment" />
            <Col2>
              <Field label="Teacher Role" required error={errors.teacherType}>
                <select
                  style={{ ...inputStyle(false), cursor: 'pointer' }}
                  value={form.teacherType}
                  onChange={e => setForm({ ...form, teacherType: e.target.value, primaryClassId: '' })}
                >
                  <option value="SUBJECT_TEACHER">Subject Teacher</option>
                  <option value="CLASS_TEACHER">Class Teacher</option>
                  <option value="BOTH">Class Teacher + Subject Teacher</option>
                </select>
              </Field>

              {(form.teacherType === 'CLASS_TEACHER' || form.teacherType === 'BOTH') ? (
                <Field label={form.teacherType === 'BOTH' ? 'Primary Class (Class Teacher)' : 'Primary Class'} required error={errors.primaryClassId}>
                  <select
                    style={{ ...inputStyle(!!errors.primaryClassId), cursor: 'pointer' }}
                    value={form.primaryClassId}
                    onChange={e => setForm({ ...form, primaryClassId: e.target.value })}
                  >
                    <option value="">Select class</option>
                    {classList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.section ? ` - ${c.section}` : ''}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    This teacher will mark attendance for this class.
                  </p>
                </Field>
              ) : (
                <Field label="Classes Taught" optional>
                  <ClassPicker
                    classList={classList}
                    value={form.classes}
                    onChange={v => setForm({ ...form, classes: v })}
                    label="Select classes this teacher teaches"
                  />
                </Field>
              )}
            </Col2>
            {form.teacherType === 'BOTH' && (
              <Field label="Additional Classes (Subject Teacher)" optional>
                <ClassPicker
                  classList={classList.filter(c => c.id !== Number(form.primaryClassId))}
                  value={form.classes}
                  onChange={v => setForm({ ...form, classes: v })}
                  label="Select additional classes where this teacher teaches a subject"
                />
              </Field>
            )}

            {/* ── Documents ────────────────────────────────────────── */}
            <Section icon="upload_file" label="Documents" />
            <Col2>
              <Field label="Upload ID Proof" optional>
                <div>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    border: '1.5px dashed var(--border-strong)', borderRadius: 8, padding: '9px 12px',
                    background: form.idProof ? '#f0fff4' : 'var(--surface-alt)', transition: 'all 0.2s',
                  }}>
                    <span className="material-icons" style={{ fontSize: 18, color: form.idProof ? '#0de1e8' : 'var(--text-muted)' }}>
                      {form.idProof ? 'check_circle' : 'upload_file'}
                    </span>
                    <span style={{ fontSize: 13, color: form.idProof ? '#276749' : 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {form.idProofName || 'Choose file (PDF / JPG / PNG, max 5 MB)'}
                    </span>
                    {form.idProofSize && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 4 }}>
                        {form.idProofSize}
                      </span>
                    )}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const sizeMB = file.size / (1024 * 1024);
                        if (sizeMB > 5) {
                          setErrors(prev => ({ ...prev, idProof: 'File too large. Maximum size is 5 MB.' }));
                          return;
                        }
                        setErrors(prev => ({ ...prev, idProof: '' }));
                        const sizeLabel = sizeMB >= 1
                          ? `${sizeMB.toFixed(1)} MB`
                          : `${(file.size / 1024).toFixed(0)} KB`;
                        const reader = new FileReader();
                        reader.onload = ev => setForm(f => ({ ...f, idProof: ev.target.result, idProofName: file.name, idProofSize: sizeLabel }));
                        reader.readAsDataURL(file);
                      }} />
                  </label>
                  {errors.idProof && <p style={{ ...errStyle, marginTop: 4 }}>{errors.idProof}</p>}
                  {form.idProof && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, idProof: '', idProofName: '', idProofSize: '' }))}
                      style={{ marginTop: 4, fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Poppins, sans-serif' }}>
                      Remove
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Upload Other Documents" optional>
                <div>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    border: '1.5px dashed var(--border-strong)', borderRadius: 8, padding: '9px 12px',
                    background: form.otherDoc ? '#f0fff4' : 'var(--surface-alt)', transition: 'all 0.2s',
                  }}>
                    <span className="material-icons" style={{ fontSize: 18, color: form.otherDoc ? '#0de1e8' : 'var(--text-muted)' }}>
                      {form.otherDoc ? 'check_circle' : 'upload_file'}
                    </span>
                    <span style={{ fontSize: 13, color: form.otherDoc ? '#276749' : 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {form.otherDocName || 'Choose file (PDF / JPG / PNG, max 5 MB)'}
                    </span>
                    {form.otherDocSize && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 4 }}>
                        {form.otherDocSize}
                      </span>
                    )}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const sizeMB = file.size / (1024 * 1024);
                        if (sizeMB > 5) {
                          setErrors(prev => ({ ...prev, otherDoc: 'File too large. Maximum size is 5 MB.' }));
                          return;
                        }
                        setErrors(prev => ({ ...prev, otherDoc: '' }));
                        const sizeLabel = sizeMB >= 1
                          ? `${sizeMB.toFixed(1)} MB`
                          : `${(file.size / 1024).toFixed(0)} KB`;
                        const reader = new FileReader();
                        reader.onload = ev => setForm(f => ({ ...f, otherDoc: ev.target.result, otherDocName: file.name, otherDocSize: sizeLabel }));
                        reader.readAsDataURL(file);
                      }} />
                  </label>
                  {errors.otherDoc && <p style={{ ...errStyle, marginTop: 4 }}>{errors.otherDoc}</p>}
                  {form.otherDoc && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, otherDoc: '', otherDocName: '', otherDocSize: '' }))}
                      style={{ marginTop: 4, fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Poppins, sans-serif' }}>
                      Remove
                    </button>
                  )}
                </div>
              </Field>
            </Col2>

          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', background: '#0de1e8', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
              <span className="material-icons" style={{ fontSize: 16 }}>{editTeacher ? 'save' : 'person_add'}</span>
              {saving ? 'Saving…' : (editTeacher ? 'Update Teacher' : 'Add Teacher & Generate Credentials')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
