import React from 'react';
import Button from '../../../components/Button';
import { examTypeLabel, statusColor, fmtDate } from './constants';

export default function SchedulesTable({ loading, schedules, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="exam-table-card">
        <div className="exam-table-wrap">
          <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading schedules…</p></div>
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="exam-table-card">
        <div className="exam-table-wrap">
          <div className="exam-empty"><span className="material-icons">event_note</span><p>No exam schedules found</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-table-card">
      <div className="exam-table-wrap">
        <table className="exam-table">
          <thead>
            <tr><th>Exam Name</th><th>Type</th><th>Class</th><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Max Marks</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {schedules.map(s => (
              <tr key={s.id}>
                <td><strong>{s.examName}</strong></td>
                <td><span className="exam-badge exam-badge-blue">{examTypeLabel[s.examType] || s.examType}</span></td>
                <td>{s.className}{s.section ? ' – ' + s.section : ''}</td>
                <td>{s.subject}</td>
                <td>{fmtDate(s.examDate)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{s.startTime} – {s.endTime}</td>
                <td>{s.hallNumber}</td>
                <td style={{ textAlign: 'center' }}>{s.maxMarks}</td>
                <td><span className={`exam-badge ${statusColor[s.status] || 'exam-badge-gray'}`}>{s.status}</span></td>
                <td>
                  <Button variant="exam-action" icon="edit" title="Edit" onClick={() => onEdit(s)} />
                  <Button variant="exam-action" className="danger" icon="delete" title="Delete" onClick={() => onDelete(s.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
