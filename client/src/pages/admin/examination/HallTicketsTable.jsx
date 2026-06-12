import React from 'react';
import Button from '../../../components/Button';
import { examTypeLabel, fmtDate } from './constants';

export default function HallTicketsTable({ loading, tickets, onPreview, onPrint, onDelete }) {
  if (loading) {
    return (
      <div className="exam-table-card">
        <div className="exam-table-wrap">
          <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading hall tickets…</p></div>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="exam-table-card">
        <div className="exam-table-wrap">
          <div className="exam-empty"><span className="material-icons">confirmation_number</span><p>No hall tickets found</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-table-card">
      <div className="exam-table-wrap">
        <table className="exam-table">
          <thead>
            <tr><th>Ticket No</th><th>Student</th><th>Roll No</th><th>Class</th><th>Exam</th><th>Type</th><th>Academic Year</th><th>Generated On</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td><strong style={{ fontFamily: 'monospace' }}>{t.ticketNumber}</strong></td>
                <td>{t.studentName}</td>
                <td>{t.rollNumber}</td>
                <td>{t.className}{t.section ? ' – ' + t.section : ''}</td>
                <td>{t.examName}</td>
                <td><span className="exam-badge exam-badge-blue">{examTypeLabel[t.examType] || t.examType}</span></td>
                <td>{t.academicYear}</td>
                <td>{fmtDate(t.createdAt)}</td>
                <td>
                  <Button variant="exam-action" className="primary" icon="visibility" title="Preview" onClick={() => onPreview(t, 'hallticket')} />
                  <Button variant="exam-action" className="success" icon="download" title="Download PDF" onClick={() => onPrint(t, 'hallticket')} />
                  <Button variant="exam-action" className="danger" icon="delete" title="Delete" onClick={() => onDelete(t.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
