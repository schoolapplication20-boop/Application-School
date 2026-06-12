import React from 'react';
import Button from '../../../components/Button';
import { certLabel, fmtDate } from './constants';

export default function CertificatesTable({ loading, certs, onPreview, onDelete }) {
  if (loading) {
    return (
      <div className="exam-table-card">
        <div className="exam-table-wrap">
          <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading certificates…</p></div>
        </div>
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="exam-table-card">
        <div className="exam-table-wrap">
          <div className="exam-empty"><span className="material-icons">workspace_premium</span><p>No certificates found</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-table-card">
      <div className="exam-table-wrap">
        <table className="exam-table">
          <thead>
            <tr><th>Cert ID</th><th>Type</th><th>Student</th><th>Roll No</th><th>Class</th><th>Issue Date</th><th>Purpose</th><th>Verified</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {certs.map(c => (
              <tr key={c.id}>
                <td><strong style={{ fontFamily: 'monospace' }}>{c.certificateId}</strong></td>
                <td><span className={`exam-badge ${c.certificateType === 'TRANSFER' ? 'exam-badge-orange' : c.certificateType === 'MARKS_MEMO' ? 'exam-badge-purple' : 'exam-badge-green'}`}>{certLabel[c.certificateType] || c.certificateType}</span></td>
                <td>{c.studentName}</td>
                <td>{c.rollNumber}</td>
                <td>{c.className}{c.section ? ' – ' + c.section : ''}</td>
                <td>{fmtDate(c.issueDate)}</td>
                <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose || '—'}</td>
                <td>
                  {c.verifiedBy
                    ? <span className="exam-badge exam-badge-green"><span className="material-icons" style={{ fontSize: '12px', marginRight: '4px' }}>verified</span>Yes</span>
                    : <span className="exam-badge exam-badge-gray">Pending</span>}
                </td>
                <td>
                  <Button variant="exam-action" className="primary" icon="print" title="Preview & Print" onClick={() => onPreview(c, 'certificate')} />
                  <Button variant="exam-action" className="danger" icon="delete" title="Delete" onClick={() => onDelete(c.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
