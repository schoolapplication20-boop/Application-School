import React from 'react';
import Button from '../../../components/Button';
import { EXAM_TYPES, examTypeLabel } from './constants';

export default function HallTicketModal({ htForm, setHtForm, students, schedules, saving, onClose, onSubmit }) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal" style={{ maxWidth: '480px' }}>
        <div className="exam-modal-header">
          <h2><span className="material-icons">confirmation_number</span>Generate Hall Ticket</h2>
          <button className="exam-modal-close" onClick={onClose}><span className="material-icons">close</span></button>
        </div>
        <div className="exam-modal-body">
          <div className="exam-form-grid full">
            <div className="exam-form-group">
              <label>Student *</label>
              <select value={htForm.studentId} onChange={e => setHtForm(f => ({ ...f, studentId: e.target.value }))}>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber}) — Class {s.className}{s.section ? ' ' + s.section : ''}</option>)}
              </select>
            </div>
            <div className="exam-form-group">
              <label>Exam Name *</label>
              <input placeholder="e.g. Annual Exam 2024" value={htForm.examName} onChange={e => setHtForm(f => ({ ...f, examName: e.target.value }))} list="exam-names-list" />
              <datalist id="exam-names-list">
                {[...new Set(schedules.map(s => s.examName))].map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div className="exam-form-group">
              <label>Exam Type</label>
              <select value={htForm.examType} onChange={e => setHtForm(f => ({ ...f, examType: e.target.value }))}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)}
              </select>
            </div>
            <div className="exam-form-group">
              <label>Academic Year</label>
              <input placeholder="2023-2024" value={htForm.academicYear} onChange={e => setHtForm(f => ({ ...f, academicYear: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="exam-modal-footer">
          <Button variant="exam-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="exam-primary" onClick={onSubmit} disabled={saving}>
            {saving ? 'Generating…' : 'Generate Hall Ticket'}
          </Button>
        </div>
      </div>
    </div>
  );
}
