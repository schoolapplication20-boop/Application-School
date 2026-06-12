export const PAGE_SIZE = 20; // students per page — server-side

export const EMPTY_FORM = {
  name: '', rollNo: '', admissionNumber: '', class: '', section: '', dob: '', status: 'Active', photo: null,
  studentEmail: '',
  fatherName: '', fatherPhone: '',
  motherName: '', motherPhone: '',
  guardianName: '', guardianPhone: '',
  permanentAddress: '', alternateAddress: '',
  idProof: null, idProofName: '',
  tcDocument: null, tcDocumentName: '',
  bonafideDocument: null, bonafideDocumentName: '',
};

export const formatDOB = (dob) => {
  if (!dob) return '—';
  if (dob.includes('-') && dob.length === 10) {
    return new Date(dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return dob;
};

export const phoneOnly = (v) => v.replace(/\D/g, '').slice(0, 10);
