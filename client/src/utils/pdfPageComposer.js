// ─────────────────────────────────────────────────────────────────────────────
// Generic "N items per A4 page" PDF composer — renders DOM nodes to canvases and
// places them, scaled to fit, onto A4 pages. Unlike window.print(), this guarantees
// exact page counts and layout regardless of content length (no CSS page-break
// behavior to fight), and produces a real downloaded file with no browser
// print header/footer.
//
// Shared engine behind utils/hallTicketPdf.js and utils/feeReceiptPdf.js — any
// document type that needs "1/2/3/4 compact copies per A4 sheet" can build on this
// instead of re-deriving the grid math.
// ─────────────────────────────────────────────────────────────────────────────
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/** Resolves once every <img> under `element` has finished loading (or errored). */
export function waitForImages(element) {
  const images = Array.from(element.querySelectorAll('img'));
  const pending = images.filter(img => !img.complete);
  if (pending.length === 0) return Promise.resolve();
  return Promise.all(pending.map(img => new Promise(resolve => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true }); // don't block forever on a broken image
  })));
}

export async function captureElement(element) {
  return html2canvas(element, {
    scale: 2, // render at 2x for crisp text once scaled into the PDF
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/** Scales `canvas` to fit inside `rect` (contain, preserving aspect ratio) and centers it. */
export function placeCanvasInRect(pdf, canvas, rect) {
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

/**
 * Places `canvas` at its true physical size (derived from the html2canvas render scale,
 * assuming a 96dpi CSS pixel baseline) inside `rect`, centered — only shrinking (never
 * enlarging) if the natural size would overflow the rect. Unlike placeCanvasInRect (which
 * always stretches to fill the rect on at least one axis), this keeps a genuinely compact
 * document compact even inside a spacious cell — e.g. a receipt at 1-per-page stays
 * receipt-sized instead of being blown up to fill the whole A4 page.
 */
export function placeCanvasNaturalOrFit(pdf, canvas, rect, renderScale = 2) {
  const MM_PER_PX_AT_96DPI = 25.4 / 96;
  let w = (canvas.width  / renderScale) * MM_PER_PX_AT_96DPI;
  let h = (canvas.height / renderScale) * MM_PER_PX_AT_96DPI;

  const shrink = Math.min(1, rect.w / w, rect.h / h);
  w *= shrink;
  h *= shrink;

  const x = rect.x + (rect.w - w) / 2;
  const y = rect.y + (rect.h - h) / 2;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
}

/** Grid cell rectangles (mm) for N items on one A4 page, given usable margins/gap. */
export function computeCells(n, pageWidth, pageHeight, margin, gap) {
  const usableW = pageWidth - margin * 2;
  const usableH = pageHeight - margin * 2;

  if (n === 1) return [{ x: margin, y: margin, w: usableW, h: usableH }];

  if (n === 4) {
    const w = (usableW - gap) / 2;
    const h = (usableH - gap) / 2;
    return [
      { x: margin,           y: margin,           w, h },
      { x: margin + w + gap, y: margin,           w, h },
      { x: margin,           y: margin + h + gap, w, h },
      { x: margin + w + gap, y: margin + h + gap, w, h },
    ];
  }

  // n === 2 or n === 3: stacked full-width rows
  const h = (usableH - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: margin, y: margin + i * (h + gap), w: usableW, h,
  }));
}

/**
 * Renders `element` to a single A4 page jsPDF document (not yet saved/downloaded) —
 * the whole element is captured as one image and scaled to fit within the page
 * (preserving aspect ratio) — so however tall the content is, it always lands
 * on exactly one page instead of spilling onto a second.
 */
export async function buildSingleItemPdf(element) {
  if (!element) throw new Error('No element to render');
  await waitForImages(element);
  const canvas = await captureElement(element);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  placeCanvasInRect(pdf, canvas, { x: 0, y: 0, w: pageWidth, h: pageHeight });
  return pdf;
}

/** Same as buildSingleItemPdf, but saves/downloads the result as `filename`. */
export async function downloadSingleItemPdf(element, filename) {
  const pdf = await buildSingleItemPdf(element);
  pdf.save(filename);
}

/**
 * Renders a list of already-mounted DOM elements into one jsPDF document (not yet
 * saved/downloaded), N per A4 page. Each element is captured as its own canvas and
 * confined to its own grid cell — an item can never split across a page boundary,
 * and every page except possibly the last holds exactly N items (last page holds
 * the remainder, never a blank page).
 *
 * elements.length items at N per page => Math.ceil(elements.length / N) pages.
 */
export async function buildItemsGroupPdf(elements, itemsPerPage, opts = {}) {
  if (!elements || elements.length === 0) throw new Error('No items to render');
  const n = itemsPerPage || 1;
  const margin = opts.margin ?? 8;
  const gap = opts.gap ?? 4;
  const place = opts.placeFn || placeCanvasInRect;

  await Promise.all(elements.map(waitForImages));

  // Capture sequentially — html2canvas doesn't parallelize well and this keeps memory bounded
  // even for a large batch.
  const canvases = [];
  for (const el of elements) {
    canvases.push(await captureElement(el));
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const cells = computeCells(n, pageWidth, pageHeight, margin, gap);

  canvases.forEach((canvas, i) => {
    const cellIndex = i % n;
    if (cellIndex === 0) {
      if (i > 0) pdf.addPage();
      if (n > 1) {
        // Separator lines between items on this page (drawn for the full grid up front,
        // so an under-filled last page still shows clean cell boundaries).
        pdf.setDrawColor(190, 190, 190);
        pdf.setLineWidth(0.2);
        cells.forEach(c => pdf.rect(c.x, c.y, c.w, c.h));
      }
    }
    place(pdf, canvas, cells[cellIndex]);
  });

  return pdf;
}

/** Same as buildItemsGroupPdf, but saves/downloads the result as `filename`. */
export async function downloadItemsGroupPdf(elements, itemsPerPage, filename, opts = {}) {
  const pdf = await buildItemsGroupPdf(elements, itemsPerPage, opts);
  pdf.save(filename);
}

/** Opens an already-built jsPDF document in a new browser tab via a blob URL (view/print without forcing a download). */
export function openPdfInNewTab(pdf) {
  const blobUrl = pdf.output('bloburl');
  window.open(blobUrl, '_blank');
}
