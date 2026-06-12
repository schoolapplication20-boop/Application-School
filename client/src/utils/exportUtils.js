// ─── Shared export utilities (CSV download + printable report) ───────────────

export const exportCSV = (rows, filename = 'attendance_report.csv') => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};

export const exportPrintReport = (title, html) => {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;padding:24px;color:#2d3748}
      h1{font-size:20px;margin-bottom:4px}
      p.sub{font-size:12px;color:#718096;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f7fafc;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#718096;border-bottom:2px solid #e2e8f0}
      td{padding:10px 12px;border-bottom:1px solid #f0f4f8}
      .green{color:#276749;background:#f0fff4;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      .red{color:#c53030;background:#fff5f5;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      .orange{color:#c05621;background:#fffaf0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      @media print{body{padding:0}}
    </style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};
