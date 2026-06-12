// Derive a stable colour from any string so subject chips look distinct
export function subjectColor(str) {
  if (!str) return '#0de1e8';
  const palette = ['#0de1e8','#3182ce','#805ad5','#e53e3e','#ed8936','#38b2ac',
                   '#d69e2e','#e91e63','#667eea','#48bb78','#ed64a6','#f6ad55'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

export const getInitials = (name) =>
  (name || 'T').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const EMPTY_FORM = {
  name: '', empId: '', subject: '', department: '', qualification: '',
  experience: '', joining: '', mobile: '', email: '', classes: '', status: 'Active',
  idProof: '', idProofName: '', idProofSize: '', otherDoc: '', otherDocName: '', otherDocSize: '',
  password: '',
  teacherType: 'SUBJECT_TEACHER',
  primaryClassId: '',
};

export const inputStyle = (hasError) => ({
  width: '100%', padding: '9px 12px', fontSize: '13px', fontFamily: 'Poppins, sans-serif',
  border: `1.5px solid ${hasError ? '#e53e3e' : '#e2e8f0'}`, borderRadius: '8px',
  outline: 'none', boxSizing: 'border-box', color: '#2d3748', background: '#fff',
  transition: 'border-color 0.2s',
});
export const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '5px' };
export const errStyle   = { fontSize: '11px', color: '#e53e3e', marginTop: '4px' };
