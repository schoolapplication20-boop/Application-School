import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { schoolAPI, BASE_URL } from '../../services/api';
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

      </div>
    </Layout>
  );
};

export default SchoolSettings;
