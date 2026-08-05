// ─────────────────────────────────────────────────────────────────────────────
// Hall Ticket PDF generation — renders ticket DOM nodes to canvases and places
// them, scaled to fit, onto A4 pages. Unlike window.print(), this guarantees
// exact page counts and layout regardless of content length (no CSS page-break
// behavior to fight), and produces a real downloaded file with no browser
// print header/footer.
// ─────────────────────────────────────────────────────────────────────────────
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * How many tickets each print template packs onto one A4 page. The UI-facing labels/
 * descriptions live in pages/admin/examination/constants.js — kept separate so the
 * (lightweight) template picker doesn't statically pull html2canvas/jsPDF into the main
 * Examination bundle; this file is only ever reached via dynamic import().
 */
const TEMPLATE_TICKETS_PER_PAGE = {
  ONE_PER_PAGE: 1,
  THREE_PER_PAGE: 3,
};

/** Resolves once every <img> under `element` has finished loading (or errored). */
function waitForImages(element) {
  const images = Array.from(element.querySelectorAll('img'));
  const pending = images.filter(img => !img.complete);
  if (pending.length === 0) return Promise.resolve();
  return Promise.all(pending.map(img => new Promise(resolve => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true }); // don't block forever on a broken image
  })));
}

async function captureElement(element) {
  return html2canvas(element, {
    scale: 2, // render at 2x for crisp text once scaled into the PDF
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/**
 * Renders `element` to a single A4 page PDF and downloads it as `filename`.
 * The whole element is captured as one image and scaled to fit within the page
 * (preserving aspect ratio) — so however tall the ticket's content is, it always
 * lands on exactly one page instead of spilling a signature block onto a second.
 */
export async function downloadElementAsSinglePagePdf(element, filename) {
  if (!element) throw new Error('No element to render');
  await waitForImages(element);
  const canvas = await captureElement(element);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  placeCanvasInRect(pdf, canvas, { x: 0, y: 0, w: pageWidth, h: pageHeight });
  pdf.save(filename);
}

/** Scales `canvas` to fit inside `rect` (contain, preserving aspect ratio) and centers it. */
function placeCanvasInRect(pdf, canvas, rect) {
  const ratio = canvas.width / canvas.height;
  let w = rect.w;
  let h = w / ratio;
  if (h > rect.h) {
    h = rect.h;
    w = h * ratio;
  }
  const x = rect.x + (rect.w - w) / 2;
  const y = rect.y + (rect.h - h) / 2;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
}

/** Grid cell rectangles (mm) for N tickets on one A4 page, given usable margins/gap. */
function computeCells(n, pageWidth, pageHeight, margin, gap) {
  const usableW = pageWidth - margin * 2;
  const usableH = pageHeight - margin * 2;

  if (n === 1) return [{ x: margin, y: margin, w: usableW, h: usableH }];

  // n === 3: three stacked full-width rows
  const h = (usableH - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: margin, y: margin + i * (h + gap), w: usableW, h,
  }));
}

/**
 * Renders a list of already-mounted ticket DOM elements into one PDF, N per A4
 * page per `template` (see PRINT_TEMPLATES). Each ticket is captured as its own
 * canvas and confined to its own grid cell — a ticket can never split across a
 * page boundary, and every page except possibly the last holds exactly N
 * tickets (last page holds the remainder, never a blank page).
 *
 * elements.length tickets at N per page => Math.ceil(elements.length / N) pages.
 */
export async function downloadHallTicketsGroupPdf(elements, template, filename) {
  if (!elements || elements.length === 0) throw new Error('No tickets to render');
  const n = TEMPLATE_TICKETS_PER_PAGE[template] || 1;

  await Promise.all(elements.map(waitForImages));

  // Capture sequentially — html2canvas doesn't parallelize well and this keeps memory bounded
  // even for a full class of 40+ tickets.
  const canvases = [];
  for (const el of elements) {
    canvases.push(await captureElement(el));
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const gap = 4;
  const cells = computeCells(n, pageWidth, pageHeight, margin, gap);

  canvases.forEach((canvas, i) => {
    const cellIndex = i % n;
    if (cellIndex === 0) {
      if (i > 0) pdf.addPage();
      if (n > 1) {
        // Separator lines between tickets on this page (drawn for the full grid up front,
        // so an under-filled last page still shows clean cell boundaries).
        pdf.setDrawColor(190, 190, 190);
        pdf.setLineWidth(0.2);
        cells.forEach(c => pdf.rect(c.x, c.y, c.w, c.h));
      }
    }
    placeCanvasInRect(pdf, canvas, cells[cellIndex]);
  });

  pdf.save(filename);
}
