import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { schoolAPI, examTypeAPI, gradeScaleAPI, adminAPI, authConfigAPI, diaryConfigAPI, privacyConfigAPI, BASE_URL } from '../../services/api';
import Layout from '../../components/Layout';

const MAX_SIZE_MB = 5;
const ACCEPTED   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const SchoolSettings = () => {
  const { user }                         = useAuth();
  const { school, logoVersion, loadSchool } = useSchool();

  // ── Year Rollover ────────────────────────────────────────────────────────────
  const [showRollover,   setShowRollover]   = useState(false);
  const [rolloverYear,   setRolloverYear]   = useState('');
  const [copyFees,       setCopyFees]       = useState(true);
  const [rollingOver,    setRollingOver]    = useState(false);
  const [rolloverResult, setRolloverResult] = useState(null); // { previousYear, newYear, feeStructuresCopied }
  const [rolloverError,  setRolloverError]  = useState('');

  const suggestNextYear = () => {
    const current = school?.academicYear || '';
    const match = current.match(/(\d{4})/);
    if (match) {
      const start    = parseInt(match[1]);
      const next     = start + 1;
      const nextEnd  = next + 1;
      // 2-digit suffix format e.g. "2025-26" → "2026-27"
      if (/\d{4}-\d{2}$/.test(current)) return `${next}-${String(nextEnd % 100).padStart(2, '0')}`;
      // 4-digit suffix format e.g. "2025-2026" → "2026-2027"
      return `${next}-${nextEnd}`;
    }
    return '';
  };

  const handleRollover = async () => {
    if (!rolloverYear.trim()) { setRolloverError('Please enter the new academic year.'); return; }
    setRollingOver(true); setRolloverError('');
    try {
      const res = await adminAPI.yearRollover({ newAcademicYear: rolloverYear.trim(), copyFeeStructures: copyFees });
      setRolloverResult(res.data?.data);
    } catch (err) {
      setRolloverError(err.response?.data?.message || 'Rollover failed. Please try again.');
    } finally { setRollingOver(false); }
  };

  const [dragging,  setDragging]  = useState(false);
  const [preview,   setPreview]   = useState(null);   // local blob URL for preview
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const inputRef = useRef(null);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canEditAuthConfig = user?.role === 'SUPER_ADMIN' || user?.role === 'APPLICATION_OWNER';

  // ── Auth config ──────────────────────────────────────────────────────────────
  const AUTH_CONFIG_DEFAULTS = {
    studentLoginMethod: 'EMAIL_OR_ADMISSION',
    emailMandatoryStudents: true,
    emailVerification: true,
    forgotPasswordMethod: 'EMAIL_OTP',
    allowSelfSignup: true,
    sessionTimeoutMinutes: 60,
    maxFailedAttempts: 5,
  };

  const [authConfig,    setAuthConfig]    = useState(AUTH_CONFIG_DEFAULTS);
  const [acLoading,     setAcLoading]     = useState(false);
  const [acSaving,      setAcSaving]      = useState(false);
  const [acError,       setAcError]       = useState('');
  const [acSuccess,     setAcSuccess]     = useState('');

  const loadAuthConfig = useCallback(async () => {
    setAcLoading(true);
    try {
      const r = await authConfigAPI.get();
      const d = r.data?.data;
      if (d) {
        setAuthConfig({
          studentLoginMethod:     d.studentLoginMethod     ?? AUTH_CONFIG_DEFAULTS.studentLoginMethod,
          emailMandatoryStudents: d.emailMandatoryStudents ?? AUTH_CONFIG_DEFAULTS.emailMandatoryStudents,
          emailVerification:      d.emailVerification      ?? AUTH_CONFIG_DEFAULTS.emailVerification,
          forgotPasswordMethod:   d.forgotPasswordMethod   ?? AUTH_CONFIG_DEFAULTS.forgotPasswordMethod,
          allowSelfSignup:        d.allowSelfSignup        ?? AUTH_CONFIG_DEFAULTS.allowSelfSignup,
          sessionTimeoutMinutes:  d.sessionTimeoutMinutes  ?? AUTH_CONFIG_DEFAULTS.sessionTimeoutMinutes,
          maxFailedAttempts:      d.maxFailedAttempts      ?? AUTH_CONFIG_DEFAULTS.maxFailedAttempts,
        });
      }
    } catch { /* silently use defaults */ }
    finally { setAcLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { loadAuthConfig(); }, [loadAuthConfig]);

  const handleSaveAuthConfig = async () => {
    setAcError(''); setAcSuccess(''); setAcSaving(true);
    try {
      await authConfigAPI.update(authConfig);
      setAcSuccess('Authentication settings saved successfully.');
    } catch (err) {
      setAcError(err.response?.data?.message || 'Failed to save authentication settings.');
    } finally { setAcSaving(false); }
  };

  const updateAc = (field, value) => setAuthConfig(prev => ({ ...prev, [field]: value }));

  // ── Diary config ─────────────────────────────────────────────────────────────
  const DIARY_CONFIG_DEFAULTS = {
    diaryMode: 'SUBJECT_TEACHER',
    coordinatorUserId: '',
    requiresAdminApproval: false,
    notifyStudentsPush: false,
    notifyParentsWhatsapp: false,
  };

  const [diaryConfig,    setDiaryConfig]    = useState(DIARY_CONFIG_DEFAULTS);
  const [dcLoading,      setDcLoading]      = useState(false);
  const [dcSaving,       setDcSaving]       = useState(false);
  const [dcError,        setDcError]        = useState('');
  const [dcSuccess,      setDcSuccess]      = useState('');

  const loadDiaryConfig = useCallback(async () => {
    setDcLoading(true);
    try {
      const r = await diaryConfigAPI.get();
      const d = r.data?.data;
      if (d) {
        setDiaryConfig({
          diaryMode:             d.diaryMode             ?? DIARY_CONFIG_DEFAULTS.diaryMode,
          // Show email in the input when available; fall back to numeric ID as string
          coordinatorUserId:     d.coordinatorEmail      ?? (d.coordinatorUserId ? String(d.coordinatorUserId) : DIARY_CONFIG_DEFAULTS.coordinatorUserId),
          // Backend returns both requiresApproval and requiresAdminApproval — read either
          requiresAdminApproval: d.requiresAdminApproval ?? d.requiresApproval ?? DIARY_CONFIG_DEFAULTS.requiresAdminApproval,
          notifyStudentsPush:    d.notifyStudentsPush    ?? DIARY_CONFIG_DEFAULTS.notifyStudentsPush,
          notifyParentsWhatsapp: d.notifyParentsWhatsapp ?? DIARY_CONFIG_DEFAULTS.notifyParentsWhatsapp,
        });
      }
    } catch { /* silently use defaults */ }
    finally { setDcLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { loadDiaryConfig(); }, [loadDiaryConfig]);

  const handleSaveDiaryConfig = async () => {
    setDcError(''); setDcSuccess(''); setDcSaving(true);
    try {
      await diaryConfigAPI.update(diaryConfig);
      setDcSuccess('Diary configuration saved successfully.');
    } catch (err) {
      setDcError(err.response?.data?.message || 'Failed to save diary configuration.');
    } finally { setDcSaving(false); }
  };

  const updateDc = (field, value) => setDiaryConfig(prev => ({ ...prev, [field]: value }));

  // ── Privacy config ────────────────────────────────────────────────────────────
  const [privacyConfig,  setPrivacyConfig]  = useState({ hideStudentContactInfo: false });
  const [pcSaving,       setPcSaving]       = useState(false);
  const [pcError,        setPcError]        = useState('');
  const [pcSuccess,      setPcSuccess]      = useState('');

  const loadPrivacyConfig = useCallback(async () => {
    try {
      const r = await privacyConfigAPI.get();
      const d = r.data?.data;
      if (d) setPrivacyConfig({ hideStudentContactInfo: d.hideStudentContactInfo ?? false });
    } catch { /* silently use defaults */ }
  }, []);

  useEffect(() => { loadPrivacyConfig(); }, [loadPrivacyConfig]);

  const handleSavePrivacyConfig = async () => {
    setPcError(''); setPcSuccess(''); setPcSaving(true);
    try {
      await privacyConfigAPI.update(privacyConfig);
      setPcSuccess('Privacy settings saved successfully.');
    } catch (err) {
      setPcError(err.response?.data?.message || 'Failed to save privacy settings.');
    } finally { setPcSaving(false); }
  };

  // ── Exam type management ─────────────────────────────────────────────────────
  const [examTypes,    setExamTypes]    = useState([]);
  const [etLoading,    setEtLoading]    = useState(false);
  const [newEtName,    setNewEtName]    = useState('');
  const [newEtOrder,   setNewEtOrder]   = useState('');
  const [etSaving,     setEtSaving]     = useState(false);
  const [etError,      setEtError]      = useState('');
  const [etSuccess,    setEtSuccess]    = useState('');
  const [editingEt,    setEditingEt]    = useState(null); // {id, name, displayOrder}

  const loadExamTypes = useCallback(async () => {
    setEtLoading(true);
    try {
      const r = await examTypeAPI.list();
      setExamTypes(r.data?.data || []);
    } catch { setExamTypes([]); }
    finally { setEtLoading(false); }
  }, []);

  useEffect(() => { if (canEdit) loadExamTypes(); }, [canEdit, loadExamTypes]);

  const handleAddExamType = async (e) => {
    e.preventDefault();
    if (!newEtName.trim()) return;
    setEtError(''); setEtSuccess(''); setEtSaving(true);
    try {
      await examTypeAPI.create({ name: newEtName.trim(), displayOrder: parseInt(newEtOrder) || 0 });
      setNewEtName(''); setNewEtOrder('');
      setEtSuccess('Exam type added.');
      await loadExamTypes();
    } catch (err) {
      setEtError(err.response?.data?.message || 'Failed to add exam type.');
    } finally { setEtSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingEt || !editingEt.name.trim()) return;
    setEtError(''); setEtSuccess(''); setEtSaving(true);
    try {
      await examTypeAPI.update(editingEt.id, { name: editingEt.name.trim(), displayOrder: parseInt(editingEt.displayOrder) || 0, isActive: editingEt.isActive });
      setEditingEt(null);
      setEtSuccess('Updated.');
      await loadExamTypes();
    } catch (err) {
      setEtError(err.response?.data?.message || 'Failed to update.');
    } finally { setEtSaving(false); }
  };

  const handleDeleteExamType = async (id) => {
    if (!window.confirm('Delete this exam type?')) return;
    setEtError(''); setEtSuccess('');
    try {
      await examTypeAPI.remove(id);
      setEtSuccess('Deleted.');
      await loadExamTypes();
    } catch (err) {
      setEtError(err.response?.data?.message || 'Failed to delete.');
    }
  };

  // ── Grade scale management ───────────────────────────────────────────────────
  const DEFAULT_SCALE = [
    { grade: 'O',  minPercentage: 90, displayOrder: 1 },
    { grade: 'A+', minPercentage: 80, displayOrder: 2 },
    { grade: 'A',  minPercentage: 70, displayOrder: 3 },
    { grade: 'B+', minPercentage: 60, displayOrder: 4 },
    { grade: 'B',  minPercentage: 50, displayOrder: 5 },
    { grade: 'B-', minPercentage: 40, displayOrder: 6 },
    { grade: 'C',  minPercentage: 33, displayOrder: 7 },
    { grade: 'F',  minPercentage:  0, displayOrder: 8 },
  ];

  const [gsRows,    setGsRows]    = useState([]);
  const [gsLoading, setGsLoading] = useState(false);
  const [gsSaving,  setGsSaving]  = useState(false);
  const [gsError,   setGsError]   = useState('');
  const [gsSuccess, setGsSuccess] = useState('');

  const loadGradeScales = useCallback(async () => {
    setGsLoading(true);
    try {
      const r = await gradeScaleAPI.list();
      const data = r.data?.data || [];
      setGsRows(data.length ? data.map(g => ({ grade: g.grade, minPercentage: g.minPercentage, displayOrder: g.displayOrder ?? 0 })) : DEFAULT_SCALE);
    } catch { setGsRows(DEFAULT_SCALE); }
    finally { setGsLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { if (canEdit) loadGradeScales(); }, [canEdit, loadGradeScales]);

  const updateGsRow = (idx, field, val) =>
    setGsRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));

  const addGsRow = () =>
    setGsRows(rows => [...rows, { grade: '', minPercentage: '', displayOrder: rows.length + 1 }]);

  const removeGsRow = (idx) =>
    setGsRows(rows => rows.filter((_, i) => i !== idx));

  const handleSaveGradeScale = async () => {
    setGsError(''); setGsSuccess(''); setGsSaving(true);
    const items = gsRows.map((r, i) => ({
      grade: r.grade.trim(),
      minPercentage: parseFloat(r.minPercentage),
      displayOrder: i + 1,
    })).filter(r => r.grade);
    if (!items.length) { setGsError('Add at least one grade.'); setGsSaving(false); return; }
    try {
      await gradeScaleAPI.save(items);
      setGsSuccess('Grade scale saved successfully.');
      await loadGradeScales();
    } catch (err) {
      setGsError(err.response?.data?.message || 'Failed to save grade scale.');
    } finally { setGsSaving(false); }
  };

  const resetPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setError('');
    setSuccess(false);
  };

  const validateAndSet = (f) => {
    setSuccess(false);
    setError('');
    if (!ACCEPTED.includes(f.type)) {
      setError('Only JPEG, PNG, GIF, or WebP images are allowed.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setFile(f);
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) validateAndSet(f);
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  }, []);

  const handleUpload = async () => {
    if (!file || !school?.schoolId) return;
    setUploading(true);
    setError('');
    try {
      await schoolAPI.updateLogo(school.schoolId, file);
      await loadSchool();
      resetPreview();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resolvedLogoUrl = school?.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;
  const currentLogoSrc = resolvedLogoUrl ? `${resolvedLogoUrl}?v=${logoVersion}` : null;

  return (
    <>
    <Layout pageTitle="School Settings">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Page heading ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>School Settings</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            Manage your school's branding. The logo appears on the login page, sidebar, and all school portals.
          </p>
        </div>

        {/* ── Logo card ── */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border-strong)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              School Logo
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Recommended: square image, at least 200×200 px, max 5 MB.
            </p>
          </div>

          <div style={{ padding: '24px', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Current / preview logo display */}
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                {preview ? 'New Logo Preview' : 'Current Logo'}
              </p>
              <div style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                border: '2px dashed var(--border-strong)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-alt)',
                position: 'relative',
              }}>
                {(preview || currentLogoSrc) ? (
                  <img
                    src={preview || currentLogoSrc}
                    alt="School logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 12 }}>
                    <span className="material-icons" style={{ fontSize: 40, color: 'var(--border-strong)' }}>image</span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>No logo set</p>
                  </div>
                )}
                {preview && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: '#2563EB', borderRadius: '50%',
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-icons" style={{ fontSize: 13, color: '#fff' }}>visibility</span>
                  </div>
                )}
              </div>

              {/* Sidebar preview chip */}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                Sidebar preview
              </p>
              <div style={{
                background: '#1e293b',
                borderRadius: 10,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  overflow: 'hidden', flexShrink: 0,
                  background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {(preview || currentLogoSrc) ? (
                    <img src={preview || currentLogoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>
                      {(school?.name || 'S').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1.2 }}>
                    {school?.name || 'School Name'}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>Management System</p>
                </div>
              </div>
            </div>

            {/* Upload area */}
            {canEdit && (
              <div style={{ flex: 1, minWidth: 220 }}>
                {/* Drag-and-drop zone */}
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragging ? '#2563EB' : 'var(--border-strong)'}`,
                    borderRadius: 12,
                    padding: '28px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? '#EFF6FF' : 'var(--surface-alt)',
                    transition: 'all 0.15s',
                    marginBottom: 16,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 36, color: dragging ? '#2563EB' : 'var(--text-muted)' }}>
                    cloud_upload
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 600, color: dragging ? '#2563EB' : 'var(--text-secondary)', margin: '8px 0 4px' }}>
                    {dragging ? 'Drop it here' : 'Drag & drop or click to browse'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    JPEG · PNG · GIF · WebP · Max {MAX_SIZE_MB} MB
                  </p>
                </div>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />

                {/* Error / success */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#FEF2F2', color: '#DC2626', borderRadius: 8,
                    padding: '10px 12px', fontSize: 13, marginBottom: 12,
                    border: '1px solid #FECACA',
                  }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>error_outline</span>
                    {error}
                  </div>
                )}

                {success && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#F0FDF4', color: '#16A34A', borderRadius: 8,
                    padding: '10px 12px', fontSize: 13, marginBottom: 12,
                    border: '1px solid #BBF7D0',
                  }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>check_circle</span>
                    Logo updated successfully! Changes are live across all school portals.
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {file && (
                    <>
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                          background: uploading ? '#94a3b8' : 'linear-gradient(135deg,#2563EB,#7C3AED)',
                          color: '#fff', fontWeight: 700, fontSize: 14,
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {uploading ? (
                          <>
                            <span style={{
                              width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
                              borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            }} />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <span className="material-icons" style={{ fontSize: 16 }}>upload</span>
                            Save Logo
                          </>
                        )}
                      </button>
                      <button
                        onClick={resetPreview}
                        disabled={uploading}
                        style={{
                          padding: '10px 16px', borderRadius: 10, border: '1.5px solid var(--border-strong)',
                          background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {!file && currentLogoSrc && (
                    <button
                      onClick={() => inputRef.current?.click()}
                      style={{
                        padding: '10px 18px', borderRadius: 10, border: '1.5px solid #2563EB',
                        background: 'var(--surface)', color: '#2563EB', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                      Change Logo
                    </button>
                  )}
                </div>
              </div>
            )}

            {!canEdit && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Only SUPER_ADMIN and ADMIN can update the school logo.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── School info card (read-only summary) ── */}
        <div style={{
          background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-strong)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginTop: 20,
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>School Information</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Contact your Application Owner to update school details.
            </p>
          </div>
          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {[
              { label: 'School Name',    value: school?.name },
              { label: 'School Code',    value: school?.code },
              { label: 'Board',          value: school?.board },
              { label: 'Academic Year',  value: school?.academicYear },
              { label: 'City',           value: school?.city },
              { label: 'State',          value: school?.state },
              { label: 'Phone',          value: school?.phone },
              { label: 'Email',          value: school?.email },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>
                  {label}
                </p>
                <p style={{ fontSize: 14, color: value ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Exam Types card ── */}
        {canEdit && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-strong)', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginTop: 20 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Exam Types</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Define the exam types your school uses (Unit Test 1, Quarterly, Annual Exam, etc.). Teachers pick from this list when entering marks.
              </p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {etError   && <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '9px 12px', marginBottom: 12, fontSize: 13, border: '1px solid #FECACA' }}>{etError}</div>}
              {etSuccess && <div style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 8, padding: '9px 12px', marginBottom: 12, fontSize: 13, border: '1px solid #BBF7D0' }}>{etSuccess}</div>}

              {/* Add new */}
              <form onSubmit={handleAddExamType} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <input value={newEtName} onChange={e => setNewEtName(e.target.value)}
                  placeholder="Exam name, e.g. Unit Test 1" maxLength={100} required
                  style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 9, fontSize: 13 }} />
                <input value={newEtOrder} onChange={e => setNewEtOrder(e.target.value)}
                  type="number" placeholder="Order (0=first)" min="0"
                  style={{ width: 130, padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 9, fontSize: 13 }} />
                <button type="submit" disabled={etSaving}
                  style={{ padding: '9px 18px', background: etSaving ? '#a0aec0' : '#2563EB', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: etSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>add</span>
                  {etSaving ? 'Saving…' : 'Add'}
                </button>
              </form>

              {/* List */}
              {etLoading ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Loading…</div>
              ) : examTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                  No exam types yet. Add one above — teachers will see them in the Marks page.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {examTypes.map(et => (
                    <div key={et.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, border: '1px solid var(--border-strong)' }}>
                      {editingEt?.id === et.id ? (
                        <>
                          <input value={editingEt.name} onChange={e => setEditingEt(p => ({ ...p, name: e.target.value }))}
                            maxLength={100}
                            style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #2563EB', borderRadius: 7, fontSize: 13 }} />
                          <input value={editingEt.displayOrder} onChange={e => setEditingEt(p => ({ ...p, displayOrder: e.target.value }))}
                            type="number" min="0"
                            style={{ width: 80, padding: '6px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13 }} />
                          <select value={String(editingEt.isActive)} onChange={e => setEditingEt(p => ({ ...p, isActive: e.target.value === 'true' }))}
                            style={{ padding: '6px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13 }}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                          <button onClick={handleSaveEdit} disabled={etSaving}
                            style={{ padding: '6px 12px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingEt(null)}
                            style={{ padding: '6px 12px', background: 'var(--surface-alt)', color: 'var(--text-secondary)', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{et.name}</span>
                            {!et.isActive && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>inactive</span>}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Order: {et.displayOrder ?? 0}</span>
                          <button onClick={() => setEditingEt({ id: et.id, name: et.name, displayOrder: et.displayOrder ?? 0, isActive: et.isActive !== false })}
                            style={{ padding: '5px 10px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                          <button onClick={() => handleDeleteExamType(et.id)}
                            style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Grade Scale ─────────────────────────────────────────────────── */}
        {canEdit && (
          <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border-strong)', padding: '24px 28px', marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="material-icons" style={{ color: '#d69e2e', fontSize: 22 }}>grade</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Grade Scale</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Define the percentage ranges for each grade. Teachers enter marks and grades are auto-calculated using this scale.
            </p>

            {gsError   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{gsError}</div>}
            {gsSuccess && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{gsSuccess}</div>}

            {gsLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading…</div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grade</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Min % (≥)</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applies to</div>
                  <div />
                </div>

                {gsRows.map((row, idx) => {
                  // "Applies to" is the range: minPercentage → next row's minPercentage - 1 (or 100)
                  const sorted = [...gsRows].sort((a, b) => b.minPercentage - a.minPercentage);
                  const sortedIdx = sorted.findIndex((_, i) => sorted[i].grade === row.grade && sorted[i].minPercentage === row.minPercentage);
                  const upper = sortedIdx === 0 ? 100 : (sorted[sortedIdx - 1].minPercentage - 1);
                  const rangeText = row.minPercentage !== '' ? `${row.minPercentage}% – ${upper}%` : '—';

                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <input
                        value={row.grade}
                        onChange={e => updateGsRow(idx, 'grade', e.target.value)}
                        placeholder="e.g. A+"
                        maxLength={5}
                        style={{ padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }}
                      />
                      <input
                        type="number"
                        min="0" max="100" step="0.5"
                        value={row.minPercentage}
                        onChange={e => updateGsRow(idx, 'minPercentage', e.target.value)}
                        placeholder="0"
                        style={{ padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                      />
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{rangeText}</div>
                      <button onClick={() => removeGsRow(idx)} style={{ padding: '6px 8px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: 7, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons" style={{ fontSize: 15 }}>delete</span>
                      </button>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <button onClick={addGsRow}
                    style={{ padding: '8px 16px', background: '#EFF6FF', color: '#2563EB', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    + Add Grade
                  </button>
                  <button onClick={() => setGsRows(DEFAULT_SCALE)}
                    style={{ padding: '8px 16px', background: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Reset to Default
                  </button>
                  <button onClick={handleSaveGradeScale} disabled={gsSaving}
                    style={{ padding: '8px 20px', background: gsSaving ? '#a0aec0' : '#16A34A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: gsSaving ? 'not-allowed' : 'pointer' }}>
                    {gsSaving ? 'Saving…' : 'Save Grade Scale'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Authentication Settings card ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border-strong)', padding: '24px 28px', marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className="material-icons" style={{ color: '#4f46e5', fontSize: 22 }}>lock</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Authentication Settings</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Control how students and staff log in, reset passwords, and access the school portal.
            {!canEditAuthConfig && <span style={{ color: '#d97706', fontWeight: 600 }}> (Read-only — SUPER_ADMIN or APPLICATION_OWNER required to save changes.)</span>}
          </p>

          {acError   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, border: '1px solid #fed7d7' }}>{acError}</div>}
          {acSuccess && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, border: '1px solid #c6f6d5' }}>{acSuccess}</div>}

          {acLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Student Login Method */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>
                  Student Login Method
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { value: 'EMAIL_ONLY',         label: 'Email Only',                  desc: 'Students must log in with their email address.' },
                    { value: 'ADMISSION_ONLY',      label: 'Admission Number Only',       desc: 'Students log in using their admission number.' },
                    { value: 'EMAIL_OR_ADMISSION',  label: 'Email or Admission Number',   desc: 'Students can use either their email or admission number.' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: canEditAuthConfig ? 'pointer' : 'default', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${authConfig.studentLoginMethod === opt.value ? '#4f46e5' : 'var(--border-strong)'}`, background: authConfig.studentLoginMethod === opt.value ? '#f5f3ff' : 'var(--surface-alt)' }}>
                      <input
                        type="radio"
                        name="studentLoginMethod"
                        value={opt.value}
                        checked={authConfig.studentLoginMethod === opt.value}
                        disabled={!canEditAuthConfig}
                        onChange={() => updateAc('studentLoginMethod', opt.value)}
                        style={{ marginTop: 2, accentColor: '#4f46e5', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Toggles row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Email Mandatory */}
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Email Mandatory</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Require email for student accounts</div>
                    </div>
                    <button
                      onClick={() => canEditAuthConfig && authConfig.studentLoginMethod !== 'EMAIL_ONLY' && updateAc('emailMandatoryStudents', !authConfig.emailMandatoryStudents)}
                      disabled={!canEditAuthConfig || authConfig.studentLoginMethod === 'EMAIL_ONLY'}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: (!canEditAuthConfig || authConfig.studentLoginMethod === 'EMAIL_ONLY') ? 'not-allowed' : 'pointer',
                        background: authConfig.emailMandatoryStudents ? '#4f46e5' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0, opacity: authConfig.studentLoginMethod === 'EMAIL_ONLY' ? 0.5 : 1,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: authConfig.emailMandatoryStudents ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                  {authConfig.studentLoginMethod === 'EMAIL_ONLY' && (
                    <div style={{ fontSize: 11, color: '#d97706', marginTop: 6 }}>Auto-enabled when Email Only is selected.</div>
                  )}
                </div>

                {/* Email Verification */}
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Email Verification</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Require OTP to verify email on signup</div>
                    </div>
                    <button
                      onClick={() => canEditAuthConfig && updateAc('emailVerification', !authConfig.emailVerification)}
                      disabled={!canEditAuthConfig}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: canEditAuthConfig ? 'pointer' : 'not-allowed',
                        background: authConfig.emailVerification ? '#4f46e5' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: authConfig.emailVerification ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                </div>

                {/* Allow Self-Signup */}
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Allow Student Self-Signup</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Students can create their own accounts</div>
                    </div>
                    <button
                      onClick={() => canEditAuthConfig && updateAc('allowSelfSignup', !authConfig.allowSelfSignup)}
                      disabled={!canEditAuthConfig}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: canEditAuthConfig ? 'pointer' : 'not-allowed',
                        background: authConfig.allowSelfSignup ? '#4f46e5' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: authConfig.allowSelfSignup ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Forgot Password Method */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>
                  Forgot Password Method
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { value: 'EMAIL_OTP',  label: 'Email OTP' },
                    { value: 'MOBILE_OTP', label: 'Mobile OTP' },
                    { value: 'BOTH',       label: 'Both' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: canEditAuthConfig ? 'pointer' : 'default', padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${authConfig.forgotPasswordMethod === opt.value ? '#4f46e5' : 'var(--border-strong)'}`, background: authConfig.forgotPasswordMethod === opt.value ? '#f5f3ff' : 'var(--surface-alt)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="forgotPasswordMethod"
                        value={opt.value}
                        checked={authConfig.forgotPasswordMethod === opt.value}
                        disabled={!canEditAuthConfig}
                        onChange={() => updateAc('forgotPasswordMethod', opt.value)}
                        style={{ accentColor: '#4f46e5' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Number inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="5" max="1440" step="5"
                    value={authConfig.sessionTimeoutMinutes}
                    disabled={!canEditAuthConfig}
                    onChange={e => updateAc('sessionTimeoutMinutes', parseInt(e.target.value) || 60)}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: canEditAuthConfig ? undefined : 'var(--surface-alt)', color: 'var(--text-primary)' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>5 – 1440 min (1 day max)</p>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                    Max Failed Login Attempts
                  </label>
                  <input
                    type="number"
                    min="1" max="20"
                    value={authConfig.maxFailedAttempts}
                    disabled={!canEditAuthConfig}
                    onChange={e => updateAc('maxFailedAttempts', parseInt(e.target.value) || 5)}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: canEditAuthConfig ? undefined : 'var(--surface-alt)', color: 'var(--text-primary)' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>Lockout after this many failed attempts</p>
                </div>
              </div>

              {/* Save button — only for SUPER_ADMIN / APPLICATION_OWNER */}
              {canEditAuthConfig && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={handleSaveAuthConfig}
                    disabled={acSaving}
                    style={{ padding: '9px 24px', background: acSaving ? '#a0aec0' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: acSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {acSaving ? (
                      <>
                        <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                        Saving…
                      </>
                    ) : (
                      <>
                        <span className="material-icons" style={{ fontSize: 16 }}>save</span>
                        Save Auth Settings
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Diary Configuration card ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border-strong)', padding: '24px 28px', marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className="material-icons" style={{ color: '#0369a1', fontSize: 22 }}>menu_book</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Diary Configuration</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Control who can post diary entries and how students and parents are notified.
            {!canEdit && <span style={{ color: '#d97706', fontWeight: 600 }}> (Read-only — SUPER_ADMIN or ADMIN required to save changes.)</span>}
          </p>

          {dcError   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, border: '1px solid #fed7d7' }}>{dcError}</div>}
          {dcSuccess && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, border: '1px solid #c6f6d5' }}>{dcSuccess}</div>}

          {dcLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Diary Mode */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>
                  Diary Mode
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { value: 'COORDINATOR',     label: 'School-wide Coordinator', desc: 'Only one designated user creates all diary entries for the school.' },
                    { value: 'CLASS_TEACHER',   label: 'Class Teacher',           desc: 'The class teacher posts diary entries for their assigned class.' },
                    { value: 'SUBJECT_TEACHER', label: 'Subject Teacher',         desc: 'Any teacher assigned to a subject can post entries for that class (current default).' },
                    { value: 'HYBRID',          label: 'Hybrid',                  desc: 'Both class teachers and subject teachers can post diary entries.' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: canEdit ? 'pointer' : 'default', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${diaryConfig.diaryMode === opt.value ? '#0369a1' : 'var(--border-strong)'}`, background: diaryConfig.diaryMode === opt.value ? '#f0f9ff' : 'var(--surface-alt)' }}>
                      <input
                        type="radio"
                        name="diaryMode"
                        value={opt.value}
                        checked={diaryConfig.diaryMode === opt.value}
                        disabled={!canEdit}
                        onChange={() => updateDc('diaryMode', opt.value)}
                        style={{ marginTop: 2, accentColor: '#0369a1', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Coordinator User ID — visible only when COORDINATOR mode is selected */}
              {diaryConfig.diaryMode === 'COORDINATOR' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                    Coordinator User ID
                  </label>
                  <input
                    type="text"
                    value={diaryConfig.coordinatorUserId}
                    disabled={!canEdit}
                    onChange={e => updateDc('coordinatorUserId', e.target.value)}
                    placeholder="Enter the user ID of the coordinator"
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: canEdit ? undefined : 'var(--surface-alt)', color: 'var(--text-primary)' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>The user ID of the staff member responsible for posting all diary entries.</p>
                </div>
              )}

              {/* Toggle switches */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Requires Admin Approval */}
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Requires Admin Approval</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Entries must be approved before students can see them</div>
                    </div>
                    <button
                      onClick={() => canEdit && updateDc('requiresAdminApproval', !diaryConfig.requiresAdminApproval)}
                      disabled={!canEdit}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed',
                        background: diaryConfig.requiresAdminApproval ? '#0369a1' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: diaryConfig.requiresAdminApproval ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                </div>

                {/* Notify Students via Push Notification */}
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notify Students via Push</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Send push notification to students when a new entry is posted</div>
                    </div>
                    <button
                      onClick={() => canEdit && updateDc('notifyStudentsPush', !diaryConfig.notifyStudentsPush)}
                      disabled={!canEdit}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed',
                        background: diaryConfig.notifyStudentsPush ? '#0369a1' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: diaryConfig.notifyStudentsPush ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                </div>

                {/* Notify Parents via WhatsApp */}
                <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notify Parents via WhatsApp</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Send a WhatsApp message to parents when a new entry is posted</div>
                    </div>
                    <button
                      onClick={() => canEdit && updateDc('notifyParentsWhatsapp', !diaryConfig.notifyParentsWhatsapp)}
                      disabled={!canEdit}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed',
                        background: diaryConfig.notifyParentsWhatsapp ? '#0369a1' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, left: diaryConfig.notifyParentsWhatsapp ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save button */}
              {canEdit && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={handleSaveDiaryConfig}
                    disabled={dcSaving}
                    style={{ padding: '9px 24px', background: dcSaving ? '#a0aec0' : '#0369a1', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: dcSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {dcSaving ? (
                      <>
                        <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                        Saving…
                      </>
                    ) : (
                      <>
                        <span className="material-icons" style={{ fontSize: 16 }}>save</span>
                        Save Diary Config
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Privacy Config card ── */}
        {canEdit && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-strong)', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginTop: 20 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Student Data Privacy</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Control which roles can see sensitive student information (phone numbers, parent email).
              </p>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pcError   && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>{pcError}</div>}
              {pcSuccess && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#15803d' }}>{pcSuccess}</div>}

              {/* Toggle */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={privacyConfig.hideStudentContactInfo}
                  onChange={e => setPrivacyConfig(prev => ({ ...prev, hideStudentContactInfo: e.target.checked }))}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: '#0369a1', cursor: 'pointer' }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    Hide student contact info from teachers
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    When enabled, teachers can only see student name, class, and roll number.
                    Phone numbers, parent email, and fee details are visible only to Admin and Super Admin.
                  </p>
                </div>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSavePrivacyConfig}
                  disabled={pcSaving}
                  style={{ padding: '9px 24px', background: pcSaving ? '#a0aec0' : '#0369a1', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: pcSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {pcSaving ? (
                    <>
                      <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <span className="material-icons" style={{ fontSize: 16 }}>save</span>
                      Save Privacy Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── New Academic Year card ── */}
        {canEdit && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-strong)', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginTop: 20 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Academic Year</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Current year: <strong>{school?.academicYear || '—'}</strong> · Transition to a new academic year, carry over fee structures, then promote students class by class.
                </p>
              </div>
              <button
                onClick={() => { setShowRollover(true); setRolloverYear(suggestNextYear()); setRolloverResult(null); setRolloverError(''); setCopyFees(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: 17 }}>calendar_today</span>
                Start New Year
              </button>
            </div>

            {/* Step guide */}
            <div style={{ padding: '18px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { step: '1', icon: 'calendar_today', color: '#4f46e5', title: 'Update Year', desc: 'Click "Start New Year" to change the school academic year and optionally copy fee structures.' },
                  { step: '2', icon: 'school',         color: '#0369a1', title: 'Promote Students', desc: 'Go to Students → Promote Students to move each class to the next (Class 5 → 6, etc.).' },
                  { step: '3', icon: 'payments',       color: '#16a34a', title: 'Assign New Fees', desc: 'Go to Fees & Payments → Class Fee Structures to review or adjust copied fee structures for the new year.' },
                ].map(({ step, icon, color, title, desc }) => (
                  <div key={step} style={{ background: '#f8faff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e8eaf6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ fontSize: 15, color }}>{icon}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Step {step}: {title}</div>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>

    {/* ── Year Rollover Modal ─────────────────────────────────────────────────── */}
    {showRollover && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
           onClick={e => e.target === e.currentTarget && setShowRollover(false)}>
        <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 28px 72px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Start New Academic Year</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
                Current: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{school?.academicYear || '—'}</strong>
              </div>
            </div>
            <button onClick={() => setShowRollover(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ padding: 24 }}>
            {rolloverResult ? (
              /* ── Success state ── */
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <span className="material-icons" style={{ fontSize: 30, color: '#16a34a' }}>check_circle</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>Year Updated!</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                    Academic year changed from <strong>{rolloverResult.previousYear}</strong> to <strong>{rolloverResult.newYear}</strong>
                  </p>
                  {rolloverResult.feeStructuresCopied > 0 && (
                    <p style={{ margin: '6px 0 0', color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
                      ✓ {rolloverResult.feeStructuresCopied} fee structure{rolloverResult.feeStructuresCopied !== 1 ? 's' : ''} copied to {rolloverResult.newYear}
                    </p>
                  )}
                </div>

                {/* Remaining steps checklist */}
                <div style={{ background: '#f8faff', borderRadius: 10, padding: 16, marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Remaining tasks</div>
                  {[
                    'Go to Students → Promote Students to move each class to the next',
                    'Review copied fee structures in Fees & Payments → Class Fee Structures',
                    'Assign new fee amounts to students for the new year',
                  ].map((task, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <span className="material-icons" style={{ fontSize: 15, color: '#4f46e5', flexShrink: 0, marginTop: 1 }}>radio_button_unchecked</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{task}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => { setShowRollover(false); window.location.reload(); }}
                  style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Done — Reload Page
                </button>
              </>
            ) : (
              /* ── Form state ── */
              <>
                {rolloverError && (
                  <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{rolloverError}</div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>New Academic Year *</label>
                  <input
                    type="text" placeholder="e.g. 2026-27"
                    value={rolloverYear} onChange={e => setRolloverYear(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 700, border: '2px solid var(--border-strong)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                  />
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Use the same format as your current year (e.g. 2026-27 or 2026-2027)</p>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
                  <input type="checkbox" checked={copyFees} onChange={e => setCopyFees(e.target.checked)}
                    style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, accentColor: '#4f46e5' }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Copy fee structures to new year</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Duplicates each class's fee breakdown (tuition, transport, lab, etc.) for {rolloverYear || 'the new year'}. You can edit amounts afterwards in Fees &amp; Payments.
                    </p>
                  </div>
                </label>

                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 20, lineHeight: 1.6 }}>
                  <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 5 }}>info</span>
                  This only updates the <strong>year label</strong> and optionally copies fee templates. Existing student data, marks, and fee records are <strong>not changed</strong>. You will promote students separately.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowRollover(false); setRolloverYear(''); setRolloverError(''); setCopyFees(true); }}
                    style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleRollover} disabled={rollingOver || !rolloverYear.trim()} style={{ padding: '9px 22px', border: 'none', borderRadius: 8, background: (rollingOver || !rolloverYear.trim()) ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: (rollingOver || !rolloverYear.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {rollingOver
                      ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Updating…</>
                      : <><span className="material-icons" style={{ fontSize: 16 }}>calendar_today</span>Confirm Year Change</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default SchoolSettings;
