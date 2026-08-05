import React from 'react';
import Button from '../../../components/Button';
import { PRINT_TEMPLATES } from './constants';

const CELLS_BY_TEMPLATE = {
  FULL_ONE_PER_PAGE: 1,
  COMPACT_TWO_PER_PAGE: 2,
  COMPACT_THREE_PER_PAGE: 3,
  COMPACT_FOUR_PER_PAGE: 4,
};

/** Small A4-shaped mockup showing how N tickets get arranged on the page — the actual layout used by hallTicketPdf.js (1 full page / stacked rows / 2x2 grid for 4). */
function LayoutPreview({ n, active }) {
  const border = active ? '#2b6cb0' : '#a0aec0';
  const fill = active ? '#bee3f8' : '#e2e8f0';
  const cellStyle = { border: `1px solid ${border}`, background: fill, borderRadius: 1.5 };
  const gridProps = n === 4
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 3 }
    : { display: 'flex', flexDirection: 'column', gap: 3 };
  return (
    <div style={{
      width: 34, height: 48, padding: 3, boxSizing: 'border-box',
      border: `1.5px solid ${border}`, borderRadius: 3, background: '#fff', ...gridProps,
    }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ ...cellStyle, flex: n === 4 ? undefined : 1 }} />
      ))}
    </div>
  );
}

export default function PrintTemplateModal({ count, template, setTemplate, generating, onClose, onDownload }) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && !generating && onClose()}>
      <div className="exam-modal" style={{ maxWidth: 480 }}>
        <div className="exam-modal-header">
          <h2><span className="material-icons">grid_view</span>Choose Print Template</h2>
          <button className="exam-modal-close" onClick={() => !generating && onClose()}><span className="material-icons">close</span></button>
        </div>
        <div className="exam-modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
            {count} hall ticket{count !== 1 ? 's' : ''} will be combined into one PDF, laid out per your chosen template.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PRINT_TEMPLATES.map(t => {
              const active = template === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  disabled={generating}
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    border: active ? '2px solid #2b6cb0' : '1.5px solid var(--border-strong)',
                    background: active ? '#ebf8ff' : 'var(--surface)',
                  }}>
                  {active && (
                    <span className="material-icons" style={{ position: 'absolute', top: 6, right: 6, fontSize: 15, color: '#2b6cb0' }}>check_circle</span>
                  )}
                  <LayoutPreview n={CELLS_BY_TEMPLATE[t.value]} active={active} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: active ? '#2b6cb0' : 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="exam-modal-footer">
          <Button variant="exam-secondary" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button variant="exam-primary" onClick={onDownload} disabled={generating}>
            {generating
              ? 'Generating PDF…'
              : `Download PDF (${CELLS_BY_TEMPLATE[template] || 1} per page)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
