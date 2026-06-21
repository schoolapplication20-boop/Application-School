import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ProfessionalReportCard from '../../components/ProfessionalReportCard';
import { reportCardAPI, gradeScaleAPI } from '../../services/api';

export default function ReportCard() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [examTypes,     setExamTypes]     = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [gradeScale,    setGradeScale]    = useState([]);

  useEffect(() => {
    gradeScaleAPI.forStudent().then(r => setGradeScale(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    reportCardAPI.getMyFilters()
      .then(r => {
        const types = r.data?.data?.examTypes || [];
        setExamTypes(types);
        setSelected(types.length > 0 ? types[0] : '');
      })
      .catch(() => setSelected(''))
      .finally(() => setFiltersLoaded(true));
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;
    setLoading(true);
    setError('');
    reportCardAPI.getMyReportCard(selected || null)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load report card. Please try again.'))
      .finally(() => setLoading(false));
  }, [selected, filtersLoaded]);

  const handlePrint = () => {
    document.body.classList.add('printing-report-card');
    window.print();
    const cleanup = () => {
      document.body.classList.remove('printing-report-card');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
  };

  if (loading) return (
    <Layout pageTitle="Report Card">
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-secondary)' }}>
        <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_top</span>
        Loading report card…
      </div>
    </Layout>
  );

  if (error || !data) return (
    <Layout pageTitle="Report Card">
      <div style={{ textAlign: 'center', padding: 80, color: '#c53030' }}>
        <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>error</span>
        {error || 'No report card data available.'}
      </div>
    </Layout>
  );

  return (
    <Layout pageTitle="Report Card">
      <style>{`
        @media print {
          body.printing-report-card > *              { visibility: hidden; }
          body.printing-report-card #rc-student-page,
          body.printing-report-card #rc-student-page * { visibility: visible !important; }
          body.printing-report-card #rc-student-page {
            position: fixed; top: 0; left: 0; right: 0;
          }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* Exam selector */}
        <div className="rc-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Examination:</label>
            {examTypes.length > 0 ? (
              <select value={selected} onChange={e => setSelected(e.target.value)}
                style={{ padding: '8px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--surface)', cursor: 'pointer' }}>
                {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No exams recorded yet</span>
            )}
          </div>
        </div>

        <div id="rc-student-page">
          <ProfessionalReportCard
            data={data}
            gradeScale={gradeScale}
            examFilter={selected}
            onPrint={handlePrint}
            printId="rc-student-page"
          />
        </div>
      </div>
    </Layout>
  );
}
