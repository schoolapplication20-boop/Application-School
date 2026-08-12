// ─────────────────────────────────────────────────────────────────────────────
// Fee Receipt PDF generation — thin receipt-flavored wrapper around the generic
// N-per-page engine in pdfPageComposer.js. See utils/hallTicketPdf.js for the
// same pattern applied to hall tickets.
// ─────────────────────────────────────────────────────────────────────────────
import { downloadItemsGroupPdf, buildItemsGroupPdf, placeCanvasNaturalOrFit, openPdfInNewTab } from './pdfPageComposer';

export { openPdfInNewTab };

export const RECEIPT_PRINT_TEMPLATES = [
  { value: 'ONE_PER_PAGE',   label: '1 receipt per A4 page' },
  { value: 'TWO_PER_PAGE',   label: '2 receipts per A4 page' },
  { value: 'THREE_PER_PAGE', label: '3 receipts per A4 page' },
];

export const RECEIPT_TEMPLATE_PER_PAGE = {
  ONE_PER_PAGE: 1,
  TWO_PER_PAGE: 2,
  THREE_PER_PAGE: 3,
};

/**
 * Renders a list of already-mounted receipt DOM elements into one PDF, N per A4
 * page per `template`. Each receipt is captured as its own canvas confined to
 * its own grid cell, so it can never split across a page boundary — and stays
 * visually compact even in a 1-per-page cell instead of stretching to fill it
 * (CompactFeeReceipt.jsx has a fixed compact width; placeCanvasInRect only ever
 * scales it down to fit, never up).
 */
export async function downloadFeeReceiptsPdf(elements, template, filename) {
  const n = RECEIPT_TEMPLATE_PER_PAGE[template] || 1;
  return downloadItemsGroupPdf(elements, n, filename, { margin: 8, gap: 5, placeFn: placeCanvasNaturalOrFit });
}

/** Same layout as downloadFeeReceiptsPdf, but returns the built PDF instead of saving it — for "View"/"Print" (open in a new tab) instead of a forced download. */
export async function buildFeeReceiptsPdf(elements, template) {
  const n = RECEIPT_TEMPLATE_PER_PAGE[template] || 1;
  return buildItemsGroupPdf(elements, n, { margin: 8, gap: 5, placeFn: placeCanvasNaturalOrFit });
}
