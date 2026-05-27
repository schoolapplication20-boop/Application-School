import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ParentAcknowledge() {
  const [params] = useSearchParams();
  const token    = params.get('token');
  const [state,  setState]  = useState('loading'); // loading | success | error | invalid
  const [data,   setData]   = useState(null);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    axios.get(`${BASE_URL}/api/leave/parent-ack`, { params: { token } })
      .then(r => { setState('success'); setData(r.data); })
      .catch(err => {
        const msg = err.response?.data?.message || '';
        if (msg.toLowerCase().includes('already')) { setState('already'); setData(err.response?.data); }
        else setState('error');
      });
  }, [token]);

  const card = (icon, iconColor, title, subtitle, body) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: iconColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span className="material-icons" style={{ fontSize: 40, color: iconColor }}>{icon}</span>
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1a202c' }}>{title}</h2>
        {subtitle && <p style={{ margin: '0 0 16px', fontSize: 14, color: '#718096', fontWeight: 600 }}>{subtitle}</p>}
        {body}
        <p style={{ marginTop: 24, fontSize: 12, color: '#a0aec0' }}>Powered by My-Skoolz</p>
      </div>
    </div>
  );

  if (state === 'loading') return card('hourglass_top', '#4299e1', 'Processing…', 'Please wait', null);

  if (state === 'invalid') return card('error', '#e53e3e', 'Invalid Link', 'This link is not valid or has expired.', null);

  if (state === 'error') return card('error', '#e53e3e', 'Something went wrong', null,
    <p style={{ color: '#718096', fontSize: 14 }}>The link may be invalid or expired. Please contact the school directly.</p>
  );

  if (state === 'already') return card('check_circle', '#48bb78', 'Already Acknowledged', null,
    <div>
      {data?.studentName && <p style={{ color: '#4a5568', fontSize: 14 }}>Leave request for <strong>{data.studentName}</strong> was already acknowledged.</p>}
    </div>
  );

  return card('check_circle', '#48bb78', 'Leave Acknowledged!', null,
    <div>
      {data?.studentName && <p style={{ color: '#4a5568', fontSize: 14, marginBottom: 8 }}>
        You have acknowledged the leave request for <strong>{data.studentName}</strong>.
      </p>}
      {(data?.fromDate || data?.toDate) && (
        <div style={{ background: '#f0fff4', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#276749', fontWeight: 600 }}>
          {data.fromDate} → {data.toDate}
        </div>
      )}
      <p style={{ marginTop: 16, color: '#718096', fontSize: 13 }}>
        The school has been notified. Thank you!
      </p>
    </div>
  );
}
