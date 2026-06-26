import { useState } from 'react';
import api from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultHours = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = { open: day !== 'Sunday', from: '09:00', to: '22:00' };
    return acc;
  }, {});

export default function BusinessHoursStep({ data, updateData, onNext, onBack }) {
  const [hours, setHours] = useState(data.businessHours || defaultHours());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (day) =>
    setHours((h) => ({ ...h, [day]: { ...h[day], open: !h[day].open } }));

  const setTime = (day, field, value) =>
    setHours((h) => ({ ...h, [day]: { ...h[day], [field]: value } }));

  const handleNext = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch('/businesses/hours', { businessHours: hours });
      updateData({ businessHours: hours });
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onb-step">
      <div className="onb-step-header">
        <h2 className="onb-step-title">Business Hours</h2>
        <p className="onb-step-desc">Set when you're open for orders. The bot will automatically handle after-hours messages.</p>
      </div>

      {error && <div className="onb-error">{error}</div>}

      <div className="onb-hours-grid">
        {DAYS.map((day) => (
          <div key={day} className={`onb-hours-row ${!hours[day].open ? 'closed' : ''}`}>
            <label className="onb-toggle-wrap">
              <input
                type="checkbox"
                className="onb-toggle-input"
                checked={hours[day].open}
                onChange={() => toggle(day)}
              />
              <span className="onb-toggle-track" />
              <span className="onb-hours-day">{day}</span>
            </label>

            {hours[day].open ? (
              <div className="onb-hours-times">
                <input
                  type="time"
                  className="onb-time-input"
                  value={hours[day].from}
                  onChange={(e) => setTime(day, 'from', e.target.value)}
                />
                <span className="onb-hours-dash">to</span>
                <input
                  type="time"
                  className="onb-time-input"
                  value={hours[day].to}
                  onChange={(e) => setTime(day, 'to', e.target.value)}
                />
              </div>
            ) : (
              <span className="onb-closed-badge">Closed</span>
            )}
          </div>
        ))}
      </div>

      <div className="onb-actions">
        <button className="btn btn-outline" onClick={onBack} disabled={saving}>← Back</button>
        <button className="btn btn-primary" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
