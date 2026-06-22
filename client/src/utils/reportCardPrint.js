// ─────────────────────────────────────────────────────────────────────────────
// Report Card print utility — new-window HTML generation
// Used by: ReportCardHub (Admin, Super Admin, Teacher) + student/ReportCard
// Opening a dedicated window removes all portal CSS from the equation and
// ensures identical, paginating A4 output in every portal.
// ─────────────────────────────────────────────────────────────────────────────

const B = '#bfdbfe';         // border
const DARK_BLUE = '#1e3a8a';
const LIGHT_BG  = '#eff6ff';

const GRADE_STYLE = {
  O:    'background:#dcfce7;color:#14532d',
  'A+': 'background:#dbeafe;color:#1e3a8a',
  A:    'background:#e0f2fe;color:#1e40af',
  'B+': 'background:#fef3c7;color:#78350f',
  B:    'background:#ffedd5;color:#7c2d12',
  'B-': 'background:#ede9fe;color:#4c1d95',
  C:    'background:#fff7ed;color:#9a3412',
  D:    'background:#fef9c3;color:#713f12',
  F:    'background:#fee2e2;color:#7f1d1d',
};

function gradeFromPct(pct) {
  if (pct >= 91) return 'O';
  if (pct >= 81) return 'A+';
  if (pct >= 71) return 'A';
  if (pct >= 61) return 'B+';
  if (pct >= 51) return 'B';
  if (pct >= 41) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

function isFailing(r) {
  return r.grade === 'F' || (r.maxMarks > 0 && Math.round((r.marks / r.maxMarks) * 100) < 35);
}

function gradeChip(g) {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-weight:800;font-size:11px;${GRADE_STYLE[g] || 'background:#f3f4f6;color:#374151'}">${g || '—'}</span>`;
}

function passLabel(fail) {
  return `<span style="font-weight:700;color:${fail ? '#dc2626' : '#16a34a'}">${fail ? 'FAIL' : 'PASS'}</span>`;
}

const GRADE_PAIRS = [
  ['91 - 100', 'O',   '51 - 60',  'B' ],
  ['81 - 90',  'A+',  '41 - 50',  'C' ],
  ['71 - 80',  'A',   '35 - 40',  'D' ],
  ['61 - 70',  'B+',  'Below 35', 'F' ],
];

const PRINT_STYLES = `
  @page { size:A4 portrait; margin:8mm 10mm }
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
  body {
    background:#fff;
    font-family:"Segoe UI",Arial,sans-serif;
    font-size:12px;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
    color-adjust:exact;
  }
  .page { page-break-after:always; display:flex; flex-direction:column; gap:8px; padding:0 }
  .page:last-child { page-break-after:avoid }

  /* ── Header ── */
  .hdr { border:2px solid #1d4ed8; border-radius:6px; padding:14px 18px 12px; margin-bottom:8px }
  .logo { width:80px; height:80px; object-fit:contain; flex-shrink:0 }
  .logo-ph {
    width:80px; height:80px; background:${LIGHT_BG}; border-radius:8px;
    display:flex; align-items:center; justify-content:center;
    color:#1d4ed8; font-weight:900; font-size:26px;
    border:2px solid ${B}; flex-shrink:0
  }
  .school-name { font-size:20px; font-weight:900; color:${DARK_BLUE}; letter-spacing:1px; text-transform:uppercase }
  .school-det  { font-size:11px; color:#374151; margin-top:3px }
  .yr-box {
    border:2px solid ${DARK_BLUE}; border-radius:4px; padding:7px 13px;
    text-align:center; min-width:96px; background:${LIGHT_BG}; flex-shrink:0
  }
  .yr-lbl { font-size:9px; font-weight:700; color:${DARK_BLUE}; text-transform:uppercase; letter-spacing:.5px }
  .yr-val { font-size:15px; font-weight:900; color:${DARK_BLUE}; margin-top:3px }
  .title-row { margin-top:13px; padding-top:11px; border-top:1.5px solid ${B} }
  .rc-title { font-size:15px; font-weight:900; letter-spacing:4px; color:${DARK_BLUE}; text-transform:uppercase; white-space:nowrap }

  /* ── Sections ── */
  .box { border:1.5px solid ${B}; border-radius:4px; overflow:hidden; margin-bottom:8px }
  .sec-hdr {
    background:${DARK_BLUE}; padding:5px 14px;
    font-size:11px; font-weight:700; color:#fff;
    text-transform:uppercase; letter-spacing:1px;
    display:flex; align-items:center
  }

  /* ── Student info ── */
  .si-tbl { width:100%; border-collapse:collapse; border:1.5px solid ${B}; margin-bottom:8px; font-size:12px }
  .si-lbl { font-size:11px; font-weight:700; color:#4b5563 }
  .si-val { font-size:12px; font-weight:600; color:#111827 }

  /* ── Attendance ── */
  .att-tbl { width:100%; border-collapse:collapse; font-size:12px }
  .att-tbl th {
    padding:7px 10px; text-align:center; font-weight:700; color:${DARK_BLUE};
    background:${LIGHT_BG}; border-bottom:1px solid ${B}; border-right:1px solid ${B}; font-size:11px
  }
  .att-tbl td { padding:8px 10px; text-align:center; font-weight:700 }

  /* ── Marks table ── */
  .exam-section { border:1.5px solid ${B}; border-radius:4px; overflow:hidden; margin-bottom:8px }
  .mtbl { width:100%; border-collapse:collapse; font-size:11px }
  .mtbl th {
    padding:7px 8px; background:${DARK_BLUE}; color:#fff; font-weight:700;
    font-size:10px; text-align:center;
    border-right:1px solid #2d4d8c; border-bottom:1px solid #2d4d8c
  }
  .mtbl td { padding:5px 7px; border-bottom:1px solid #e5e7eb }

  /* ── Academic summary ── */
  .sum-tbl { width:100%; border-collapse:collapse; font-size:12px }
  .sum-tbl th {
    padding:7px 8px; text-align:center; font-weight:700; color:${DARK_BLUE};
    background:${LIGHT_BG}; border-bottom:1px solid ${B}; border-right:1px solid ${B}; font-size:11px
  }
  .sum-tbl td { padding:10px 8px; text-align:center }

  @media print { .page { page-break-after:always } .page:last-child { page-break-after:avoid } }
`;

// ── Build one card's HTML ─────────────────────────────────────────────────────
export function buildCard(data, examLabel = '') {
  if (!data) return '<div class="page"><p style="color:#999;padding:20px">No data available</p></div>';

  const { student = {}, school = {}, marksByExam = {}, attendance = {} } = data;
  const logoOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const logoSrc = school.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${logoOrigin}${school.logoUrl}`)
    : null;

  const allEntries = Object.entries(marksByExam);
  const allRows    = allEntries.flatMap(([, r]) => r);
  const gTotal     = allRows.reduce((s, r) => s + Number(r.marks    || 0), 0);
  const gMax       = allRows.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
  const oPct       = gMax > 0 ? Math.round((gTotal / gMax) * 100) : 0;
  const oGrade     = gradeFromPct(oPct);
  const oFail      = allRows.some(isFailing);

  // ── Exam sections HTML ──────────────────────────────────────────────────────
  const examsHtml = allEntries.map(([et, rows]) => {
    const tot = rows.reduce((s, r) => s + Number(r.marks    || 0), 0);
    const mx  = rows.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
    const ep  = mx > 0 ? Math.round((tot / mx) * 100) : 0;
    const eg  = gradeFromPct(ep);
    const ef  = rows.some(isFailing);
    return `
      <div class="exam-section">
        <div class="sec-hdr" style="justify-content:space-between">
          <span>${et}</span>
          <span style="font-weight:800;padding:2px 12px;border-radius:20px;background:${ef ? '#dc2626' : '#16a34a'};color:#fff;font-size:10px">
            ${ef ? 'FAIL' : 'PASS'}
          </span>
        </div>
        <table class="mtbl">
          <thead><tr>
            <th style="width:32px">S.NO.</th>
            <th style="text-align:left">SUBJECT</th>
            <th>MARKS OBTAINED</th>
            <th>MAXIMUM MARKS</th>
            <th>PERCENTAGE (%)</th>
            <th>GRADE</th>
            <th style="border-right:none">RESULT</th>
          </tr></thead>
          <tbody>
            ${rows.map((r, i) => {
              const sp = r.maxMarks > 0 ? Math.round((r.marks / r.maxMarks) * 100) : 0;
              const sf = isFailing(r);
              return `<tr style="${sf ? 'background:#fef2f2' : i % 2 === 0 ? '' : 'background:#f8faff'}">
                <td style="text-align:center;color:#6b7280;border-right:1px solid ${B}">${i + 1}</td>
                <td style="font-weight:600;color:${sf ? '#991b1b' : '#111827'};border-right:1px solid ${B}">${r.subject || ''}</td>
                <td style="text-align:center;font-weight:800;color:${DARK_BLUE};font-size:13px;border-right:1px solid ${B}">${r.marks ?? '—'}</td>
                <td style="text-align:center;color:#4b5563;border-right:1px solid ${B}">${r.maxMarks ?? '—'}</td>
                <td style="text-align:center;font-weight:700;color:${sf ? '#dc2626' : sp >= 75 ? '#16a34a' : '#374151'};border-right:1px solid ${B}">${r.maxMarks > 0 ? sp + '%' : '—'}</td>
                <td style="text-align:center;border-right:1px solid ${B}">${gradeChip(r.grade)}</td>
                <td style="text-align:center">${r.maxMarks > 0 ? passLabel(sf) : '—'}</td>
              </tr>`;
            }).join('')}
            <tr style="background:#dbeafe;border-top:2px solid #1d4ed8;font-weight:900">
              <td colspan="2" style="padding:6px 12px;color:${DARK_BLUE};border-right:1px solid ${B}">TOTAL</td>
              <td style="text-align:center;color:${DARK_BLUE};font-size:13px;border-right:1px solid ${B}">${tot}</td>
              <td style="text-align:center;color:#374151;border-right:1px solid ${B}">${mx}</td>
              <td style="text-align:center;color:${ef ? '#dc2626' : '#16a34a'};border-right:1px solid ${B}">${ep}%</td>
              <td style="text-align:center;border-right:1px solid ${B}">${gradeChip(eg)}</td>
              <td style="text-align:center;color:${ef ? '#dc2626' : '#16a34a'}">${ef ? 'FAIL' : 'PASS'}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }).join('');

  // ── Academic summary ────────────────────────────────────────────────────────
  const summaryHtml = gMax > 0 ? `
    <div class="box">
      <div class="sec-hdr">Academic Summary</div>
      <table class="sum-tbl">
        <thead><tr>
          <th>TOTAL MARKS</th><th>MAXIMUM MARKS</th>
          <th>PERCENTAGE (%)</th><th>OVERALL GRADE</th><th style="border-right:none">RESULT</th>
        </tr></thead>
        <tbody><tr>
          <td style="font-weight:900;font-size:16px;color:${DARK_BLUE};border-right:1px solid ${B}">${gTotal}</td>
          <td style="font-weight:700;color:#374151;border-right:1px solid ${B}">${gMax}</td>
          <td style="font-weight:900;font-size:16px;color:${oFail ? '#dc2626' : '#16a34a'};border-right:1px solid ${B}">${oPct}%</td>
          <td style="border-right:1px solid ${B}">${gradeChip(oGrade)}</td>
          <td style="font-weight:900;font-size:14px;color:${oFail ? '#dc2626' : '#16a34a'};background:${oFail ? '#fef2f2' : '#f0fdf4'}">
            ${oFail ? 'FAIL' : 'PASS'}
          </td>
        </tr></tbody>
      </table>
    </div>` : '';

  // ── Grading scale pairs ─────────────────────────────────────────────────────
  const scaleRows = GRADE_PAIRS.map(([r1, g1, r2, g2], i) => `
    <tr style="${i % 2 === 0 ? '' : 'background:#f8faff'};border-bottom:1px solid ${B}">
      <td style="padding:4px 8px;text-align:center;color:#374151;border-right:1px solid ${B}">${r1}</td>
      <td style="padding:4px 8px;text-align:center;border-right:1px solid ${B}">${gradeChip(g1)}</td>
      <td style="padding:4px 8px;text-align:center;color:#374151;border-right:1px solid ${B}">${r2}</td>
      <td style="padding:4px 8px;text-align:center">${gradeChip(g2)}</td>
    </tr>`).join('');

  return `
    <div class="page">

      <!-- HEADER -->
      <div class="hdr">
        <div style="display:flex;align-items:flex-start;gap:16px">
          ${logoSrc
            ? `<img src="${logoSrc}" class="logo" onerror="this.style.display='none'">`
            : `<div class="logo-ph">${school.name?.charAt(0) || 'S'}</div>`}
          <div style="flex:1;text-align:center">
            <div class="school-name">${school.name || 'School'}</div>
            ${school.affiliationNumber
              ? `<div class="school-det">${school.board ? school.board + ' ' : ''}Affiliation No: ${school.affiliationNumber}</div>`
              : (school.board ? `<div class="school-det">${school.board} Affiliated</div>` : '')}
            ${school.address
              ? `<div class="school-det">${school.address}${school.phone ? ' | Ph: ' + school.phone : ''}</div>` : ''}
            ${(school.email || school.website)
              ? `<div class="school-det">${[school.email && 'Email: ' + school.email, school.website && 'Website: ' + school.website].filter(Boolean).join(' | ')}</div>` : ''}
          </div>
          <div class="yr-box">
            <div class="yr-lbl">Academic Year</div>
            <div class="yr-val">${school.academicYear || '—'}</div>
          </div>
        </div>
        <div class="title-row">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="height:2px;flex:1;background:linear-gradient(to right,transparent,#1d4ed8);border-radius:1px"></div>
            <div class="rc-title">Progress Report Card</div>
            <div style="height:2px;flex:1;background:linear-gradient(to left,transparent,#1d4ed8);border-radius:1px"></div>
          </div>
          ${examLabel
            ? `<div style="margin-top:8px;text-align:center">
                <span style="display:inline-block;background:${DARK_BLUE};color:#fff;padding:5px 28px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">
                  Examination: ${examLabel}
                </span>
               </div>`
            : ''}
        </div>
      </div>

      <!-- STUDENT INFO -->
      <table class="si-tbl">
        <tbody>
          <tr style="border-bottom:1px solid ${B}">
            <td style="width:50%;padding:8px 14px;border-right:1px solid ${B}">
              <span class="si-lbl">Student Name</span><span style="color:#6b7280"> : </span>
              <span class="si-val">${student.name || '—'}</span>
            </td>
            <td style="width:50%;padding:8px 14px">
              <span class="si-lbl">Roll Number</span><span style="color:#6b7280"> : </span>
              <span class="si-val">${student.rollNumber || '—'}</span>
            </td>
          </tr>
          <tr style="border-bottom:1px solid ${B}">
            <td style="padding:8px 14px;border-right:1px solid ${B}">
              <span class="si-lbl">Admission No.</span><span style="color:#6b7280"> : </span>
              <span class="si-val">${student.admissionNumber || '—'}</span>
            </td>
            <td style="padding:8px 14px">
              <span class="si-lbl">Date of Birth</span><span style="color:#6b7280"> : </span>
              <span class="si-val">${student.dateOfBirth || '—'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 14px;border-right:1px solid ${B}">
              <span class="si-lbl">Class &amp; Section</span><span style="color:#6b7280"> : </span>
              <span class="si-val">${student.className || '—'}${student.section ? ' - ' + student.section : ''}</span>
            </td>
            <td style="padding:8px 14px">
              <span class="si-lbl">Parent / Guardian</span><span style="color:#6b7280"> : </span>
              <span class="si-val">${student.parentName || '—'}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ATTENDANCE -->
      <div class="box">
        <div class="sec-hdr">Attendance Summary</div>
        <table class="att-tbl">
          <thead><tr>
            <th>TOTAL WORKING DAYS</th>
            <th>PRESENT DAYS</th>
            <th style="border-right:none">ATTENDANCE %</th>
          </tr></thead>
          <tbody><tr>
            <td style="border-right:1px solid ${B}">${attendance.totalDays ?? 0}</td>
            <td style="color:#16a34a;border-right:1px solid ${B}">${attendance.presentDays ?? 0}</td>
            <td>
              <span style="font-weight:900;font-size:14px;color:${Number(attendance.percentage || 0) >= 75 ? '#16a34a' : '#dc2626'}">
                ${Number(attendance.percentage || 0).toFixed(1)}%
              </span>
            </td>
          </tr></tbody>
        </table>
      </div>

      <!-- MARKS -->
      ${examsHtml || '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;border:1px dashed #d1d5db;border-radius:4px;margin-bottom:8px">No marks recorded</div>'}

      <!-- ACADEMIC SUMMARY -->
      ${summaryHtml}

      <!-- REMARKS + GRADING SCALE -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="box">
          <div class="sec-hdr">Class Teacher's Remarks</div>
          <div style="padding:10px 14px;background:#fafbfc;min-height:110px">
            ${[0, 1, 2].map(() => '<div style="border-bottom:1px solid #d1d5db;margin-bottom:22px;min-height:20px"></div>').join('')}
          </div>
        </div>
        <div class="box">
          <div class="sec-hdr">Grading Scale</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:${LIGHT_BG}">
              <th style="padding:5px 8px;text-align:center;color:${DARK_BLUE};border-bottom:1px solid ${B};border-right:1px solid ${B}">PERCENTAGE RANGE</th>
              <th style="padding:5px 8px;text-align:center;color:${DARK_BLUE};border-bottom:1px solid ${B};border-right:1px solid ${B}">GRADE</th>
              <th style="padding:5px 8px;text-align:center;color:${DARK_BLUE};border-bottom:1px solid ${B};border-right:1px solid ${B}">PERCENTAGE RANGE</th>
              <th style="padding:5px 8px;text-align:center;color:${DARK_BLUE};border-bottom:1px solid ${B}">GRADE</th>
            </tr></thead>
            <tbody>${scaleRows}</tbody>
          </table>
        </div>
      </div>

      <!-- NOTE -->
      <div style="font-size:10px;color:#6b7280;font-style:italic;margin-bottom:14px;padding-left:2px">
        Note: Co-scholastic areas like Work Education, Art Education, Health &amp; Physical Education and Discipline are assessed on a 3-point scale (A: Excellent, B: Good, C: Needs Improvement).
      </div>

      <!-- SIGNATURES -->
      <div style="border:1.5px solid ${B};border-radius:4px;padding:16px 20px 10px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          ${['CLASS TEACHER', 'PRINCIPAL', 'PARENT / GUARDIAN'].map(s => `
            <div style="text-align:center">
              <div style="height:44px;border-bottom:1.5px solid #374151;margin:0 16px 8px"></div>
              <div style="font-size:12px;font-weight:700;color:#1e293b">${s}</div>
              <div style="font-size:10px;color:#9ca3af;margin-top:2px">Signature</div>
            </div>`).join('')}
        </div>
      </div>

    </div>`;
}

// ── Open a new print window with one or more cards ───────────────────────────
export function openPrintWindow(cardsHtml) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Popup blocked — please allow popups for this site and try again.');
    return;
  }
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Report Card</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
${cardsHtml}
<script>
// Scale each card to fit exactly one A4 page before printing.
// Uses CSS zoom (layout-aware, unlike transform:scale) so the browser
// never generates a second page for a card that is slightly too tall.
window.addEventListener('load', function () {
  var PX_PER_MM = 96 / 25.4;
  var topMm = 8, botMm = 10;          // must match @page margin
  var availH = Math.floor((297 - topMm - botMm) * PX_PER_MM);
  document.querySelectorAll('.page').forEach(function (page) {
    var h = page.scrollHeight;
    if (h > availH) {
      page.style.zoom = (availH / h).toFixed(5);
    }
  });
  window.print();
});
<\/script>
</body>
</html>`);
  w.document.close();
}

// ── Convenience: print a single student's card ───────────────────────────────
export function printSingleCard(data, examFilter = '') {
  openPrintWindow(buildCard(data, examFilter));
}

// ── Convenience: print multiple students (class bulk print) ──────────────────
export function printAllCards(cards, examFilter = '') {
  openPrintWindow(cards.map(c => buildCard(c.data, examFilter)).join(''));
}
