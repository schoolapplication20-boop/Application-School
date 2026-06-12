import Button from '../../../components/Button';
import { SectionLabel, DocUpload } from './shared';

export default function StudentFormModal({
  editStudent, formData, setFormData, errors, setErrors, saving,
  photoPreview, photoRef, idProofRef, tcRef, bonafideRef,
  handlePhotoChange, handleDocChange, clearDoc,
  set, setPhone,
  classNames, sectionsForClass,
  capacityInfo, capacityChecking,
  studentOtp, setStudentOtp, handleStudentSendOtp, handleStudentVerifyOtp, resetStudentOtp,
  onClose, onSubmit,
}) {
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl" style={{ maxWidth: 860 }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ color: '#0de1e8', fontSize: 20 }}>
                {editStudent ? 'edit' : 'person_add'}
              </span>
              {editStudent ? 'Edit Student' : 'Add New Student'}
            </h5>
            <button className="btn-close" onClick={onClose} />
          </div>

          <form onSubmit={onSubmit}>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>

              {/* ── Photo ─────────────────────────────────────────────── */}
              <div className="text-center mb-2">
                <div
                  onClick={() => photoRef.current?.click()}
                  style={{
                    width: 88, height: 88, borderRadius: '50%', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--border)', border: '2px dashed var(--border-strong)', cursor: 'pointer',
                    position: 'relative', overflow: 'hidden',
                  }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span className="material-icons" style={{ fontSize: 38, color: 'var(--text-muted)' }}>person</span>
                  }
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 14, color: '#fff' }}>camera_alt</span>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Click to upload student photo</p>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </div>

              {/* ── Section 1: Basic Information ─────────────────────── */}
              <SectionLabel icon="badge" text="Basic Information" />
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium small">Full Name *</label>
                  <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="Enter student's full name" value={formData.name}
                    onChange={set('name')} />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-medium small">
                    Roll Number *
                    {capacityInfo?.capacity && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(1–{capacityInfo.capacity})</span>}
                  </label>
                  <input type="number" className={`form-control form-control-sm ${errors.rollNo ? 'is-invalid' : ''}`}
                    placeholder={capacityInfo?.capacity ? `1 to ${capacityInfo.capacity}` : 'e.g., 1'}
                    value={formData.rollNo}
                    min="1"
                    max={capacityInfo?.capacity || undefined}
                    onChange={e => {
                      setFormData(fd => ({ ...fd, rollNo: e.target.value }));
                      if (errors.rollNo) setErrors(er => ({ ...er, rollNo: '' }));
                    }} />
                  {errors.rollNo && <div className="invalid-feedback">{errors.rollNo}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-medium small">Admission Number</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="e.g., ADM2024001" value={formData.admissionNumber}
                    onChange={set('admissionNumber')} />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-medium small">Class *</label>
                  <select
                    className={`form-select form-select-sm ${errors.class ? 'is-invalid' : ''}`}
                    value={formData.class}
                    onChange={e => {
                      // Only clear section/rollNo when class actually changes (not on accidental same-class click)
                      if (e.target.value !== formData.class) {
                        setFormData(fd => ({ ...fd, class: e.target.value, section: '', rollNo: '' }));
                      }
                    }}
                  >
                    <option value="">Select Class</option>
                    {classNames.length === 0
                      ? <option disabled>No classes added yet — add in Class Module</option>
                      : classNames.map(n => <option key={n} value={n}>{n}</option>)
                    }
                  </select>
                  {errors.class && <div className="invalid-feedback">{errors.class}</div>}
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-medium small">Section</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.section}
                    onChange={set('section')}
                    disabled={!formData.class}
                  >
                    <option value="">Select Section</option>
                    {sectionsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Capacity indicator */}
                {formData.class && (
                  <div className="col-12" style={{ paddingTop: 2, paddingBottom: 2 }}>
                    {capacityChecking ? (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Checking class capacity…</div>
                    ) : capacityInfo ? (
                      capacityInfo.isFull ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: '8px 12px' }}>
                          <span className="material-icons" style={{ fontSize: 18, color: '#c53030' }}>block</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#c53030' }}>Maximum capacity reached for this class. Cannot add more students.</div>
                            <div style={{ fontSize: 12, color: '#e53e3e' }}>{capacityInfo.enrolled}/{capacityInfo.capacity} seats filled</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '8px 12px' }}>
                          <span className="material-icons" style={{ fontSize: 18, color: '#276749' }}>check_circle</span>
                          <div style={{ fontSize: 12, color: '#276749' }}>
                            {capacityInfo.available} seat{capacityInfo.available !== 1 ? 's' : ''} available ({capacityInfo.enrolled}/{capacityInfo.capacity} filled)
                          </div>
                        </div>
                      )
                    ) : null}
                  </div>
                )}
                <div className="col-md-4">
                  <label className="form-label fw-medium small">Date of Birth</label>
                  <input type="date" className="form-control form-control-sm"
                    value={formData.dob} max={new Date().toISOString().split('T')[0]}
                    onChange={set('dob')} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-medium small">Status</label>
                  <select className="form-select form-select-sm" value={formData.status} onChange={set('status')}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                {/* Student email — optional; if provided must be OTP-verified */}
                <div className="col-12">
                  <label className="form-label fw-medium small">
                    Student Email <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  {editStudent ? (
                    <input type="email"
                      className={`form-control form-control-sm ${errors.studentEmail ? 'is-invalid' : ''}`}
                      placeholder="student@example.com"
                      value={formData.studentEmail || ''}
                      onChange={e => setFormData(fd => ({ ...fd, studentEmail: e.target.value.replace(/\s/g, '') }))}
                    />
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="email"
                          className={`form-control form-control-sm ${errors.studentEmail ? 'is-invalid' : ''}`}
                          placeholder="student@example.com"
                          value={formData.studentEmail || ''}
                          onChange={e => { setFormData(fd => ({ ...fd, studentEmail: e.target.value.replace(/\s/g, '') })); if (!editStudent) resetStudentOtp(); }}
                        />
                        {!studentOtp.verified && (
                          <button type="button" onClick={handleStudentSendOtp} disabled={studentOtp.sending}
                            style={{ flexShrink: 0, padding: '6px 14px', background: studentOtp.sending ? '#a0aec0' : '#0369a1', border: 'none', borderRadius: 6, cursor: studentOtp.sending ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap' }}>
                            {studentOtp.sending ? 'Sending…' : studentOtp.sent ? 'Resend OTP' : 'Send OTP'}
                          </button>
                        )}
                        {studentOtp.verified && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#276749', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                            <span className="material-icons" style={{ fontSize: 18, color: '#38a169' }}>verified</span>
                            Verified
                          </span>
                        )}
                      </div>
                      {studentOtp.sent && !studentOtp.verified && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <input type="text" inputMode="numeric" maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={studentOtp.value}
                            onChange={e => setStudentOtp(s => ({ ...s, value: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))}
                            className="form-control form-control-sm"
                            style={{ letterSpacing: 4, fontWeight: 700, flex: 1 }}
                          />
                          <button type="button" onClick={handleStudentVerifyOtp} disabled={studentOtp.verifying}
                            style={{ flexShrink: 0, padding: '6px 14px', background: '#276749', border: 'none', borderRadius: 6, cursor: studentOtp.verifying ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap' }}>
                            {studentOtp.verifying ? 'Verifying…' : 'Verify'}
                          </button>
                        </div>
                      )}
                      {(studentOtp.error || errors.studentEmail) && (
                        <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }}>
                          {studentOtp.error || errors.studentEmail}
                        </div>
                      )}
                    </>
                  )}
                  {editStudent && errors.studentEmail && (
                    <div className="invalid-feedback">{errors.studentEmail}</div>
                  )}
                </div>
              </div>

              {/* ── Section 2: Parent & Guardian Information ─────────── */}
              <SectionLabel icon="family_restroom" text="Parent & Guardian Information" />
              <div className="row g-3">
                {/* Father */}
                <div className="col-12">
                  <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-icons" style={{ fontSize: 16, color: '#3182ce' }}>man</span> Father's Details
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Father's Name *</label>
                        <input type="text" className={`form-control form-control-sm ${errors.fatherName ? 'is-invalid' : ''}`}
                          placeholder="Father's full name" value={formData.fatherName}
                          onChange={set('fatherName')} />
                        {errors.fatherName && <div className="invalid-feedback">{errors.fatherName}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Father's Phone *</label>
                        <input type="tel" className={`form-control form-control-sm ${errors.fatherPhone ? 'is-invalid' : ''}`}
                          placeholder="10-digit number" value={formData.fatherPhone}
                          onChange={setPhone('fatherPhone')} maxLength={10} inputMode="numeric" />
                        {errors.fatherPhone && <div className="invalid-feedback">{errors.fatherPhone}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mother */}
                <div className="col-12">
                  <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-icons" style={{ fontSize: 16, color: '#d63384' }}>woman</span> Mother's Details
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Mother's Name *</label>
                        <input type="text" className={`form-control form-control-sm ${errors.motherName ? 'is-invalid' : ''}`}
                          placeholder="Mother's full name" value={formData.motherName}
                          onChange={set('motherName')} />
                        {errors.motherName && <div className="invalid-feedback">{errors.motherName}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Mother's Phone *</label>
                        <input type="tel" className={`form-control form-control-sm ${errors.motherPhone ? 'is-invalid' : ''}`}
                          placeholder="10-digit number" value={formData.motherPhone}
                          onChange={setPhone('motherPhone')} maxLength={10} inputMode="numeric" />
                        {errors.motherPhone && <div className="invalid-feedback">{errors.motherPhone}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardian */}
                <div className="col-12">
                  <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-icons" style={{ fontSize: 16, color: '#805ad5' }}>supervisor_account</span>
                      Guardian's Details <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(Optional)</span>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Guardian Name <span className="text-muted">(Optional)</span></label>
                        <input type="text" className="form-control form-control-sm"
                          placeholder="Guardian's full name" value={formData.guardianName}
                          onChange={set('guardianName')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium small">Guardian Phone <span className="text-muted">(Optional)</span></label>
                        <input type="tel" className={`form-control form-control-sm ${errors.guardianPhone ? 'is-invalid' : ''}`}
                          placeholder="10-digit number" value={formData.guardianPhone}
                          onChange={setPhone('guardianPhone')} maxLength={10} inputMode="numeric" />
                        {errors.guardianPhone && <div className="invalid-feedback">{errors.guardianPhone}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Address ───────────────────────────────── */}
              <SectionLabel icon="home" text="Address Details" />
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-medium small">Permanent Address *</label>
                  <textarea className={`form-control form-control-sm ${errors.permanentAddress ? 'is-invalid' : ''}`}
                    rows={2} maxLength={500} placeholder="House No, Street, Area, City, State, PIN"
                    value={formData.permanentAddress} onChange={set('permanentAddress')} />
                  {errors.permanentAddress && <div className="invalid-feedback">{errors.permanentAddress}</div>}
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium small">Alternate / Current Address <span className="text-muted">(Optional)</span></label>
                  <textarea className="form-control form-control-sm"
                    rows={2} maxLength={500} placeholder="Leave blank if same as permanent address"
                    value={formData.alternateAddress} onChange={set('alternateAddress')} />
                </div>
              </div>

              {/* ── Section 4: Documents ─────────────────────────────── */}
              <SectionLabel icon="folder_open" text="Documents" />
              <div className="row g-3">
                <div className="col-md-4">
                  <DocUpload
                    label="ID Proof" required
                    fileData={formData.idProof}
                    fileName={formData.idProofName}
                    inputRef={idProofRef}
                    onChange={handleDocChange('idProof', 'idProofName')}
                    onClear={clearDoc('idProof', 'idProofName')}
                  />
                  {errors.idProof && (
                    <div style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.idProof}</div>
                  )}
                </div>
                <div className="col-md-4">
                  <DocUpload
                    label="Transfer Certificate (TC)"
                    fileData={formData.tcDocument}
                    fileName={formData.tcDocumentName}
                    inputRef={tcRef}
                    onChange={handleDocChange('tcDocument', 'tcDocumentName')}
                    onClear={clearDoc('tcDocument', 'tcDocumentName')}
                  />
                </div>
                <div className="col-md-4">
                  <DocUpload
                    label="Bonafide Certificate"
                    fileData={formData.bonafideDocument}
                    fileName={formData.bonafideDocumentName}
                    inputRef={bonafideRef}
                    onChange={handleDocChange('bonafideDocument', 'bonafideDocumentName')}
                    onClear={clearDoc('bonafideDocument', 'bonafideDocumentName')}
                  />
                </div>
              </div>

            </div>{/* end modal-body */}

            <div className="modal-footer">
              <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                style={{ background: (!editStudent && capacityInfo?.isFull) ? '#a0aec0' : '#0de1e8', border: 'none', minWidth: 120 }}
                disabled={saving || (!editStudent && capacityInfo?.isFull)}
                title={(!editStudent && capacityInfo?.isFull) ? 'Maximum capacity reached for this class. Cannot add more students.' : undefined}
              >
                {saving ? (editStudent ? 'Updating…' : 'Adding…') : (editStudent ? 'Update Student' : 'Add Student')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
