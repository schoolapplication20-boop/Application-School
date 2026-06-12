import { useState } from 'react';

// ─── Section divider ──────────────────────────────────────────────────────────
export function SectionLabel({ icon, text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px',
      paddingBottom: 8, borderBottom: '1.5px solid var(--border)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0de1e818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#0de1e8' }}>{icon}</span>
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{text}</span>
    </div>
  );
}

// ─── Document upload box ──────────────────────────────────────────────────────
export function DocUpload({ label, required, fileData, fileName, inputRef, onChange, onClear, accept = '.pdf,.jpg,.jpeg,.png' }) {
  return (
    <div>
      <label className="form-label fw-medium small">{label} {required ? '*' : <span className="text-muted">(Optional)</span>}</label>
      {fileName ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f0fff4', border: '1.5px solid #9ae6b4', borderRadius: 10, padding: '10px 14px',
        }}>
          <span className="material-icons" style={{ color: '#276749', fontSize: 20 }}>description</span>
          <span style={{ flex: 1, fontSize: 13, color: '#276749', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          <button type="button" onClick={onClear} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#e53e3e', display: 'flex' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>cancel</span>
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-strong)', borderRadius: 10, padding: '16px 14px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            cursor: 'pointer', background: 'var(--surface-alt)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0de1e8'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
        >
          <span className="material-icons" style={{ fontSize: 28, color: 'var(--text-muted)' }}>upload_file</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Click to upload</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF, JPG, PNG</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onChange} />
    </div>
  );
}

// ─── Credential Card (same pattern as Teachers) ───────────────────────────────
export function CredentialCard({ label, value, mono }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ background: 'var(--surface-alt)', border: '1.5px solid var(--border-strong)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
      </div>
      <button onClick={copy} title="Copy" style={{ border: 'none', background: copied ? '#f0fff4' : 'var(--border-strong)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: copied ? '#0de1e8' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'Poppins, sans-serif', flexShrink: 0, transition: 'all 0.2s' }}>
        <span className="material-icons" style={{ fontSize: 15 }}>{copied ? 'check' : 'content_copy'}</span>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ─── View modal helpers ───────────────────────────────────────────────────────
export function ViewSection({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid var(--border)' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#0de1e8' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      <table className="table table-sm mb-0">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ViewRow({ label, value, mono }) {
  return (
    <tr>
      <td className="text-muted fw-medium" style={{ width: '36%', fontSize: 13 }}>{label}</td>
      <td style={{ fontSize: 13, fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</td>
    </tr>
  );
}

export function DocViewRow({ label, fileName, fileData, required }) {
  return (
    <tr>
      <td className="text-muted fw-medium" style={{ width: '36%', fontSize: 13 }}>{label}</td>
      <td>
        {fileName && fileData ? (
          <a href={fileData} download={fileName} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '4px 12px', textDecoration: 'none', color: '#276749', fontSize: 12, fontWeight: 600 }}>
            <span className="material-icons" style={{ fontSize: 15 }}>download</span>
            {fileName}
          </a>
        ) : (
          <span style={{ color: required ? '#e53e3e' : 'var(--text-muted)', fontSize: 12 }}>
            {required ? 'Not uploaded' : 'Not provided'}
          </span>
        )}
      </td>
    </tr>
  );
}
