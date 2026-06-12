import Button from '../../../components/Button';
import { formatClassName } from '../../../utils/format';
import { formatDOB } from './constants';
import { ViewSection, ViewRow, DocViewRow } from './shared';

export default function StudentProfileModal({ selectedStudent, getInitials, onClose, onEdit }) {
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg" style={{ maxWidth: 720 }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Student Profile</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

            {/* Profile header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(135deg,#0de1e8,#0eb5da)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
              {selectedStudent.photo
                ? <img src={selectedStudent.photo} alt={selectedStudent.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />
                : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', border: '3px solid rgba(255,255,255,0.4)' }}>{getInitials(selectedStudent.name)}</div>
              }
              <div>
                <h5 style={{ color: '#fff', marginBottom: 4, fontSize: 20, fontWeight: 700 }}>{selectedStudent.name}</h5>
                <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 8, fontSize: 13 }}>
                  {selectedStudent.rollNo} · Class {selectedStudent.class}{selectedStudent.section ? `-${selectedStudent.section}` : ''}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {selectedStudent.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <ViewSection title="Basic Information" icon="badge">
              <ViewRow label="Date of Birth" value={formatDOB(selectedStudent.dob)} />
              <ViewRow label="Class / Section" value={formatClassName(selectedStudent.class, selectedStudent.section) || '—'} />
              <ViewRow label="Roll Number" value={selectedStudent.rollNo} mono />
              <ViewRow label="Admission Number" value={selectedStudent.admissionNumber} mono />
              {selectedStudent.bloodGroup && <ViewRow label="Blood Group" value={selectedStudent.bloodGroup} />}
            </ViewSection>

            {/* Parents */}
            <ViewSection title="Parent & Guardian" icon="family_restroom">
              <ViewRow label="Father's Name" value={selectedStudent.fatherName || selectedStudent.parent} />
              <ViewRow label="Father's Phone" value={selectedStudent.fatherPhone || selectedStudent.mobile} mono />
              <ViewRow label="Mother's Name" value={selectedStudent.motherName} />
              <ViewRow label="Mother's Phone" value={selectedStudent.motherPhone} mono />
              {(selectedStudent.guardianName) && <>
                <ViewRow label="Guardian Name" value={selectedStudent.guardianName} />
                <ViewRow label="Guardian Phone" value={selectedStudent.guardianPhone} mono />
              </>}
            </ViewSection>

            {/* Address */}
            <ViewSection title="Address" icon="home">
              <ViewRow label="Permanent Address" value={selectedStudent.permanentAddress || selectedStudent.address} />
              {selectedStudent.alternateAddress && (
                <ViewRow label="Alternate Address" value={selectedStudent.alternateAddress} />
              )}
            </ViewSection>

            {/* Documents */}
            <ViewSection title="Documents" icon="folder_open">
              <DocViewRow label="ID Proof" fileName={selectedStudent.idProofName} fileData={selectedStudent.idProof} required />
              <DocViewRow label="Transfer Certificate (TC)" fileName={selectedStudent.tcDocumentName} fileData={selectedStudent.tcDocument} />
              <DocViewRow label="Bonafide Certificate" fileName={selectedStudent.bonafideDocumentName} fileData={selectedStudent.bonafideDocument} />
            </ViewSection>

          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" style={{ background: '#0de1e8', border: 'none' }}
              onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
