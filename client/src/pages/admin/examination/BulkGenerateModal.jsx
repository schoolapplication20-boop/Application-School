import React from 'react';
import Button from '../../../components/Button';
import { EXAM_TYPES, examTypeLabel } from './constants';

export default function BulkGenerateModal({ bulkForm, setBulkForm, students, schedules, dbClasses, dbSections, saving, onClose, onSubmit }) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal" style={{ maxWidth: '480px' }}>
        <div className="exam-modal-header">
          <h2><span className="material-icons">group</span>Bulk Generate Hall Tickets</h2>
          <button className="exam-modal-close" onClick={onClose}><span className="material-icons">close</span></button>
        </div>
        <div className="exam-modal-body">
          <div style={{ background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '9px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#c05621' }}>
            <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>info</span>
            This will generate hall tickets for all students in the selected class.
          </div>
          <div className="exam-form-grid">
            <div className="exam-form-group">
              <label>Class *</label>
              <select value={bulkForm.className} onChange={e => setBulkForm(f => ({ ...f, className: e.target.value }))}>
                <option value="">Select Class</option>
                {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="exam-form-group">
              <label>Section</label>
              <select value={bulkForm.section} onChange={e => setBulkForm(f => ({ ...f, section: e.target.value }))}>
                <option value="">All Sections</option>
                {dbSections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="exam-form-group span-2">
              <label>Exam Name *</label>
              <input placeholder="e.g. Annual Exam 2024" value={bulkForm.examName} onChange={e => setBulkForm(f => ({ ...f, examName: e.target.value }))} list="bulk-exam-names" />
              <datalist id="bulk-exam-names">
                {[...new Set(schedules.map(s => s.examName))].map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div className="exam-form-group">
              <label>Exam Type</label>
              <select value={bulkForm.examType} onChange={e => setBulkForm(f => ({ ...f, examType: e.target.value }))}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)}
              </select>
            </div>
            <div className="exam-form-group">
              <label>Academic Year</label>
              <input placeholder="2023-2024" value={bulkForm.academicYear} onChange={e => setBulkForm(f => ({ ...f, academicYear: e.target.value }))} />
            </div>
          </div>
          {bulkForm.className && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Students in Class {bulkForm.className}{bulkForm.section ? ' – ' + bulkForm.section : ''}: <strong>{students.filter(s => s.className === bulkForm.className && (!bulkForm.section || s.section === bulkForm.section)).length}</strong>
            </div>
          )}
        </div>
        <div className="exam-modal-footer">
          <Button variant="exam-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="exam-primary" onClick={onSubmit} disabled={saving}>
            {saving ? 'Generating…' : 'Generate All'}
          </Button>
        </div>
      </div>
    </div>
  );
}
