import React from 'react';
import Button from '../../../components/Button';
import { PRINT_TEMPLATES } from './constants';

export default function PrintTemplateModal({ count, template, setTemplate, generating, onClose, onDownload }) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && !generating && onClose()}>
      <div className="exam-modal" style={{ maxWidth: 460 }}>
        <div className="exam-modal-header">
          <h2><span className="material-icons">grid_view</span>Choose Print Template</h2>
          <button className="exam-modal-close" onClick={() => !generating && onClose()}><span className="material-icons">close</span></button>
        </div>
        <div className="exam-modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
            {count} hall ticket{count !== 1 ? 's' : ''} will be combined into one PDF, laid out per your chosen template.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PRINT_TEMPLATES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                disabled={generating}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                  border: template === t.value ? '2px solid #2b6cb0' : '1.5px solid var(--border-strong)',
                  background: template === t.value ? '#ebf8ff' : 'var(--surface)',
                }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: template === t.value ? '#2b6cb0' : 'var(--text-primary)' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{t.description}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="exam-modal-footer">
          <Button variant="exam-secondary" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button variant="exam-primary" onClick={onDownload} disabled={generating}>
            {generating ? 'Generating PDF…' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
