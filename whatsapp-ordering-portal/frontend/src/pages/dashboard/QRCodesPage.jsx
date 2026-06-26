import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

// QR code is rendered via a canvas using a simple URL-based approach
// In production, integrate a proper QR library (qrcode.react or similar)
function QRDisplay({ value, size = 200 }) {
  const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=000000&bgcolor=ffffff&margin=10`;
  return <img src={imgSrc} alt="QR Code" style={{ width: size, height: size, borderRadius: 8 }} />;
}

const QR_TYPES = [
  { key: 'ordering', label: '🛒 Ordering Menu', desc: 'Links to your full WhatsApp ordering menu' },
  { key: 'table',    label: '🍽️ Table QR',      desc: 'Table-specific QR for dine-in ordering' },
  { key: 'whatsapp', label: '💬 WhatsApp Link',  desc: 'Opens a WhatsApp chat with your business' },
];

export default function QRCodesPage() {
  const [business, setBusiness] = useState(null);
  const [type, setType]         = useState('ordering');
  const [tableName, setTableName] = useState('');
  const [qrValue, setQrValue]   = useState('');
  const [qrLabel, setQrLabel]   = useState('');
  const [saved, setSaved]       = useState([]);

  useEffect(() => {
    api.get('/businesses/me').then((res) => setBusiness(res.data.data)).catch(() => {});
    api.get('/qr-codes').then((res) => setSaved(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!business) return;
    const waNumber = business.whatsappNumber?.replace(/\D/g, '');
    if (type === 'ordering') {
      setQrValue(`https://wa.me/${waNumber}?text=Hi%20I%20want%20to%20order`);
      setQrLabel(`${business.businessName} — Order Menu`);
    } else if (type === 'table') {
      const tbl = tableName || 'Table 1';
      setQrValue(`https://wa.me/${waNumber}?text=Hi%20I%20am%20at%20${encodeURIComponent(tbl)}%20and%20want%20to%20order`);
      setQrLabel(`${business.businessName} — ${tbl}`);
    } else {
      setQrValue(`https://wa.me/${waNumber}`);
      setQrLabel(`${business.businessName} — WhatsApp`);
    }
  }, [type, tableName, business]);

  const handleSave = async () => {
    try {
      const res = await api.post('/qr-codes', { label: qrLabel, type, value: qrValue, tableName: type === 'table' ? tableName : undefined });
      setSaved((s) => [res.data.data, ...s]);
    } catch {}
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrValue)}&margin=20`;
    a.download = `${qrLabel.replace(/\s+/g, '_')}_QR.png`;
    a.target = '_blank';
    a.click();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this QR code?')) return;
    try {
      await api.delete(`/qr-codes/${id}`);
      setSaved((s) => s.filter((q) => q.qrCodeId !== id));
    } catch {}
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">Generate branded QR codes for instant WhatsApp ordering.</p>
        </div>
      </div>

      <div className="qr-layout">
        {/* Generator panel */}
        <div className="qr-generator card">
          <h2 className="card-title">Generate QR Code</h2>

          <div className="field">
            <label className="label">QR Code Type</label>
            <div className="qr-type-grid">
              {QR_TYPES.map((qt) => (
                <button
                  key={qt.key}
                  type="button"
                  className={`qr-type-card ${type === qt.key ? 'selected' : ''}`}
                  onClick={() => setType(qt.key)}
                >
                  <span className="qr-type-icon">{qt.label.split(' ')[0]}</span>
                  <div>
                    <div className="qr-type-name">{qt.label.split(' ').slice(1).join(' ')}</div>
                    <div className="qr-type-desc">{qt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {type === 'table' && (
            <div className="field">
              <label className="label">Table Name / Number</label>
              <input className="input" placeholder="e.g. Table 5, Rooftop, Counter" value={tableName} onChange={(e) => setTableName(e.target.value)} />
            </div>
          )}

          {qrValue && (
            <div className="qr-preview-area">
              <div className="qr-preview-box">
                <QRDisplay value={qrValue} size={200} />
                <div className="qr-preview-label">{qrLabel}</div>
              </div>

              <div className="qr-url-box">
                <label className="label">Link URL</label>
                <div className="qr-url">
                  <span>{qrValue.length > 60 ? qrValue.slice(0, 60) + '…' : qrValue}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard?.writeText(qrValue)}>Copy</button>
                </div>
              </div>

              <div className="qr-actions">
                <button className="btn btn-primary" onClick={handleDownload}>⬇ Download QR</button>
                <button className="btn btn-outline" onClick={handleSave}>💾 Save</button>
              </div>
            </div>
          )}
        </div>

        {/* Saved QR codes */}
        <div className="qr-saved">
          <h2 className="section-title">Saved QR Codes</h2>
          {saved.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⬜</div>
              <p>Generate and save QR codes to manage them here.</p>
            </div>
          ) : (
            <div className="qr-saved-grid">
              {saved.map((q) => (
                <div key={q.qrCodeId} className="qr-saved-card">
                  <QRDisplay value={q.value} size={120} />
                  <div className="qr-saved-info">
                    <div className="qr-saved-label">{q.label}</div>
                    <div className="qr-saved-meta">
                      <span className="badge badge-neutral">{q.type}</span>
                      <span className="text-muted">{q.scanCount || 0} scans</span>
                    </div>
                    <div className="qr-saved-actions">
                      <button className="btn btn-outline btn-xs" onClick={() => {
                        const a = document.createElement('a');
                        a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q.value)}&margin=20`;
                        a.download = `${q.label.replace(/\s+/g, '_')}_QR.png`;
                        a.target = '_blank';
                        a.click();
                      }}>Download</button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(q.qrCodeId)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
