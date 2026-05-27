import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { schoolAPI, examTypeAPI, gradeScaleAPI, BASE_URL } from '../../services/api';
import Layout from '../../components/Layout';

const MAX_SIZE_MB = 5;
const ACCEPTED   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const SchoolSettings = () => {
  const { user }                         = useAuth();
  const { school, logoVersion, loadSchool } = useSchool();

  const [dragging,  setDragging]  = useState(false);
  const [preview,   setPreview]   = useState(null);   // local blob URL for preview
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const inputRef = useRef(null);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

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
  }, [preview]);

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
    <Layout pageTitle="School Settings">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Page heading ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>School Settings</h1>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>
            Manage your school's branding. The logo appears on the login page, sidebar, and all school portals.
          </p>
        </div>

        {/* ── Logo card ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              School Logo
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Recommended: square image, at least 200×200 px, max 5 MB.
            </p>
          </div>

          <div style={{ padding: '24px', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Current / preview logo display */}
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                {preview ? 'New Logo Preview' : 'Current Logo'}
              </p>
              <div style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                border: '2px dashed #cbd5e1',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
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
                    <span className="material-icons" style={{ fontSize: 40, color: '#cbd5e1' }}>image</span>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>No logo set</p>
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
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
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
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Management System</p>
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
                    border: `2px dashed ${dragging ? '#2563EB' : '#cbd5e1'}`,
                    borderRadius: 12,
                    padding: '28px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? '#EFF6FF' : '#f8fafc',
                    transition: 'all 0.15s',
                    marginBottom: 16,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 36, color: dragging ? '#2563EB' : '#94a3b8' }}>
                    cloud_upload
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 600, color: dragging ? '#2563EB' : '#475569', margin: '8px 0 4px' }}>
                    {dragging ? 'Drop it here' : 'Drag & drop or click to browse'}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
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
                          padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                          background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer',
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
                        background: '#fff', color: '#2563EB', fontWeight: 600, fontSize: 14, cursor: 'pointer',
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
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Only SUPER_ADMIN and ADMIN can update the school logo.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── School info card (read-only summary) ── */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginTop: 20,
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>School Information</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
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
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>
                  {label}
                </p>
                <p style={{ fontSize: 14, color: value ? '#1e293b' : '#cbd5e1', margin: 0, fontWeight: 500 }}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Exam Types card ── */}
        {canEdit && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginTop: 20 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Exam Types</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
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
                  style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13 }} />
                <input value={newEtOrder} onChange={e => setNewEtOrder(e.target.value)}
                  type="number" placeholder="Order (0=first)" min="0"
                  style={{ width: 130, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13 }} />
                <button type="submit" disabled={etSaving}
                  style={{ padding: '9px 18px', background: etSaving ? '#a0aec0' : '#2563EB', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: etSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>add</span>
                  {etSaving ? 'Saving…' : 'Add'}
                </button>
              </form>

              {/* List */}
              {etLoading ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading…</div>
              ) : examTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>
                  No exam types yet. Add one above — teachers will see them in the Marks page.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {examTypes.map(et => (
                    <div key={et.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      {editingEt?.id === et.id ? (
                        <>
                          <input value={editingEt.name} onChange={e => setEditingEt(p => ({ ...p, name: e.target.value }))}
                            maxLength={100}
                            style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #2563EB', borderRadius: 7, fontSize: 13 }} />
                          <input value={editingEt.displayOrder} onChange={e => setEditingEt(p => ({ ...p, displayOrder: e.target.value }))}
                            type="number" min="0"
                            style={{ width: 80, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
                          <select value={String(editingEt.isActive)} onChange={e => setEditingEt(p => ({ ...p, isActive: e.target.value === 'true' }))}
                            style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13 }}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                          <button onClick={handleSaveEdit} disabled={etSaving}
                            style={{ padding: '6px 12px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingEt(null)}
                            style={{ padding: '6px 12px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{et.name}</span>
                            {!et.isActive && <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>inactive</span>}
                          </div>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Order: {et.displayOrder ?? 0}</span>
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
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="material-icons" style={{ color: '#d69e2e', fontSize: 22 }}>grade</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Grade Scale</h3>
            </div>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 20 }}>
              Define the percentage ranges for each grade. Teachers enter marks and grades are auto-calculated using this scale.
            </p>

            {gsError   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{gsError}</div>}
            {gsSuccess && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{gsSuccess}</div>}

            {gsLoading ? (
              <div style={{ color: '#a0aec0', fontSize: 13, padding: '20px 0' }}>Loading…</div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grade</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Min % (≥)</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applies to</div>
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
                        style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }}
                      />
                      <input
                        type="number"
                        min="0" max="100" step="0.5"
                        value={row.minPercentage}
                        onChange={e => updateGsRow(idx, 'minPercentage', e.target.value)}
                        placeholder="0"
                        style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                      />
                      <div style={{ fontSize: 12, color: '#718096', fontStyle: 'italic' }}>{rangeText}</div>
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
                    style={{ padding: '8px 16px', background: '#f7fafc', color: '#718096', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
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

      </div>
    </Layout>
  );
};

export default SchoolSettings;
