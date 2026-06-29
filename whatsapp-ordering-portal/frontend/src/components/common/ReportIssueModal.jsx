import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';

const ISSUE_TYPES = ['Bug', 'Feature Request', 'Question', 'Other'];

const ReportIssueModal = ({ onClose }) => {
  const [issueType, setIssueType]     = useState('Bug');
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/support/report-issue', { issueType, description });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🐛 Report an Issue</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {success ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Issue reported!</p>
            <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
              We received your report and will look into it shortly.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="form-banner form-banner-error">{error}</div>}

              <div className="field">
                <label className="label">Issue Type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ISSUE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn btn-xs ${issueType === t ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setIssueType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="issue-desc">
                  Description <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(required)</span>
                </label>
                <textarea
                  id="issue-desc"
                  className="input"
                  rows={5}
                  placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 100 }}
                />
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                  {description.length}/2000
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || description.trim().length < 10}>
                {loading ? 'Sending…' : 'Send Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

ReportIssueModal.propTypes = { onClose: PropTypes.func.isRequired };

export default ReportIssueModal;
