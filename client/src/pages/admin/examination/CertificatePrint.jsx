import React from 'react';
import { BASE_URL } from '../../../services/api';
import { certLabel, fmtDate } from './constants';

// ─── Certificate Print Preview ───────────────────────────────────────────────
export default function CertificatePrint({ cert, school }) {
  const type = cert.certificateType;
  const schoolName  = school?.name  || 'School';
  const schoolBoard = school?.board || '';
  const logoSrc = school?.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;

  const body = {
    BONAFIDE: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) is a bonafide student of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> for the academic year <strong>{cert.academicYear || '—'}</strong>. This certificate is issued for the purpose of <strong>{cert.purpose || 'official use'}</strong>.</>,
    TRANSFER: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) was a bonafide student of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> during the academic year <strong>{cert.academicYear || '—'}</strong>. The student has been granted Transfer Certificate and no dues are outstanding against the student.</>,
    COURSE_COMPLETION: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) has successfully completed the course of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> during the academic year <strong>{cert.academicYear || '—'}</strong> and has fulfilled all academic requirements.</>,
    MARKS_MEMO: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> has appeared in the examinations during the academic year <strong>{cert.academicYear || '—'}</strong>. The marks/grades obtained are as recorded in the official school register.</>,
  };

  return (
    <div className="cert-preview">
      <div className="cert-header">
        <div className="cert-logo">
          {logoSrc
            ? <img src={logoSrc} alt={schoolName} style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
            : '🏆'}
        </div>
        <div className="cert-school-name">{schoolName}</div>
        <div className="cert-school-sub">{schoolBoard ? `${schoolBoard} Affiliated` : 'Affiliated'}</div>
      </div>
      <div className="cert-type-banner">{certLabel[type] || type}</div>
      <div className="cert-body">
        {cert.verifiedBy && (
          <div className="cert-verified-banner">
            <span className="material-icons" style={{ fontSize: '18px' }}>verified</span>
            Verified by {cert.verifiedBy}
          </div>
        )}
        <div className="cert-id-line">Certificate ID: <strong>{cert.certificateId}</strong></div>
        <div className="cert-date-line">Date: {fmtDate(cert.issueDate)}</div>
        <div className="cert-to-whom">TO WHOM IT MAY CONCERN</div>
        <div style={{ marginBottom: '16px' }}><span className="cert-student-name">{cert.studentName}</span></div>
        <div className="cert-content">{body[type] || 'Certificate details not available.'}</div>
      </div>
      <div className="cert-footer">
        <div className="cert-sign-block">
          <div className="cert-sign-line" />
          <div className="cert-sign-label">Class Teacher</div>
        </div>
        <div className="cert-seal">SCHOOL<br/>SEAL</div>
        <div className="cert-sign-block">
          <div className="cert-sign-line" />
          <div className="cert-sign-label">Principal</div>
        </div>
      </div>
    </div>
  );
}
