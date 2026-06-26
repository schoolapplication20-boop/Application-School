import { useState, useRef } from 'react';
import api from '../../services/api';

export default function LogoStep({ data, updateData, onNext, onBack }) {
  const [preview, setPreview] = useState(data.logoUrl || null);
  const [file, setFile]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const inputRef              = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return; }
    if (!f.type.startsWith('image/')) { setError('Please select an image file'); return; }
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleNext = async () => {
    setSaving(true);
    setError('');
    try {
      if (file) {
        const form = new FormData();
        form.append('logo', file);
        const res = await api.post('/businesses/logo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updateData({ logoUrl: res.data.data?.logoUrl });
      }
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onb-step">
      <div className="onb-step-header">
        <h2 className="onb-step-title">Upload Your Logo</h2>
        <p className="onb-step-desc">Your logo appears in the customer ordering menu and on invoices. PNG or JPG, max 5 MB.</p>
      </div>

      {error && <div className="onb-error">{error}</div>}

      <div className="onb-logo-area">
        <div
          className="onb-logo-dropzone"
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile({ target: { files: [f] } }); }}
        >
          {preview ? (
            <img src={preview} alt="Logo preview" className="onb-logo-preview" />
          ) : (
            <>
              <span className="onb-logo-upload-icon">🖼️</span>
              <p className="onb-logo-upload-label">Drop your logo here, or <span>click to browse</span></p>
              <p className="onb-logo-upload-hint">PNG, JPG, SVG up to 5 MB · Recommended 400×400</p>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="onb-hidden" onChange={handleFile} />
        </div>

        {preview && (
          <button type="button" className="onb-logo-remove" onClick={() => { setPreview(null); setFile(null); }}>
            Remove logo
          </button>
        )}
      </div>

      <div className="onb-skip-note">
        No logo yet? You can skip this step and add it later in Settings.
      </div>

      <div className="onb-actions">
        <button className="btn btn-outline" onClick={onBack} disabled={saving}>← Back</button>
        <button className="btn btn-ghost" onClick={onNext} disabled={saving}>Skip for now</button>
        <button className="btn btn-primary" onClick={handleNext} disabled={saving || (!file && !preview)}>
          {saving ? 'Uploading…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
