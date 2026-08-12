// ─────────────────────────────────────────────────────────────────────────────
// Hall Ticket PDF generation — thin hall-ticket-flavored wrapper around the
// generic N-per-page engine in pdfPageComposer.js.
// ─────────────────────────────────────────────────────────────────────────────
import { downloadSingleItemPdf, downloadItemsGroupPdf } from './pdfPageComposer';

/**
 * How many tickets each print template packs onto one A4 page. The UI-facing labels/
 * descriptions live in pages/admin/examination/constants.js — kept separate so the
 * (lightweight) template picker doesn't statically pull html2canvas/jsPDF into the main
 * Examination bundle; this file is only ever reached via dynamic import().
 */
export const TEMPLATE_TICKETS_PER_PAGE = {
  FULL_ONE_PER_PAGE: 1,
  COMPACT_TWO_PER_PAGE: 2,
  COMPACT_THREE_PER_PAGE: 3,
  COMPACT_FOUR_PER_PAGE: 4,
};

/**
 * Renders `element` to a single A4 page PDF and downloads it as `filename`.
 * The whole element is captured as one image and scaled to fit within the page
 * (preserving aspect ratio) — so however tall the ticket's content is, it always
 * lands on exactly one page instead of spilling a signature block onto a second.
 */
export async function downloadElementAsSinglePagePdf(element, filename) {
  return downloadSingleItemPdf(element, filename);
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
  const n = TEMPLATE_TICKETS_PER_PAGE[template] || 1;
  return downloadItemsGroupPdf(elements, n, filename);
}
