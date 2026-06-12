import React from 'react';
import Button from '../../../components/Button';
import { CERT_TYPES, certLabel } from './constants';

export default function CertificateModal({ certForm, setCertForm, students, saving, onClose, onSubmit }) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal" style={{ maxWidth: '480px' }}>
        <div className="exam-modal-header">
          <h2><span className="material-icons">workspace_premium</span>Issue Certificate</h2>
          <button className="exam-modal-close" onClick={onClose}><span className="material-icons">close</span></button>
        </div>
        <div className="exam-modal-body">
          <div className="exam-form-grid full">
            <div className="exam-form-group">
              <label>Student *</label>
              <select value={certForm.studentId} onChange={e => setCertForm(f => ({ ...f, studentId: e.target.value }))}>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber}) — Class {s.className}{s.section ? ' ' + s.section : ''}</option>)}
              </select>
            </div>
            <div className="exam-form-group">
              <label>Certificate Type *</label>
              <select value={certForm.certificateType} onChange={e => setCertForm(f => ({ ...f, certificateType: e.target.value }))}>
                {CERT_TYPES.map(t => <option key={t} value={t}>{certLabel[t]}</option>)}
              </select>
            </div>
            <div className="exam-form-group">
              <label>Academic Year</label>
              <input placeholder="2023-2024" value={certForm.academicYear} onChange={e => setCertForm(f => ({ ...f, academicYear: e.target.value }))} />
            </div>
            <div className="exam-form-group">
              <label>Purpose / Reason</label>
              <input placeholder="e.g. Bank account opening" value={certForm.purpose} onChange={e => setCertForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="exam-modal-footer">
          <Button variant="exam-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="exam-primary" onClick={onSubmit} disabled={saving}>
            {saving ? 'Issuing…' : 'Issue Certificate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
