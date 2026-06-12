import React from 'react';
import Button from '../../../components/Button';
import HallTicketDocument from '../../../components/HallTicketDocument';
import CertificatePrint from './CertificatePrint';

export default function PreviewModal({ previewItem, previewType, schedules, school, onClose, onPrint }) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal" style={{ maxWidth: previewType === 'hallticket' ? '820px' : '680px' }}>
        <div className="exam-modal-header">
          <h2>
            <span className="material-icons">{previewType === 'hallticket' ? 'confirmation_number' : 'workspace_premium'}</span>
            {previewType === 'hallticket' ? 'Hall Ticket Preview' : 'Certificate Preview'}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="exam-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => onPrint(previewItem, previewType)}
            >
              <span className="material-icons" style={{ fontSize: '15px' }}>download</span>
              Download PDF
            </Button>
            <button className="exam-modal-close" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
        <div className="exam-modal-body" style={{ padding: previewType === 'hallticket' ? '16px' : '20px 24px' }}>
          {previewType === 'hallticket'
            ? <HallTicketDocument ticket={previewItem} schedules={schedules} />
            : <CertificatePrint cert={previewItem} school={school} />
          }
        </div>
      </div>
    </div>
  );
}
