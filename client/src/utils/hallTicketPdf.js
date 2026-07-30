// ─────────────────────────────────────────────────────────────────────────────
// Hall Ticket PDF generation — renders the ticket DOM to a canvas and places it,
// scaled to fit, onto a single A4 page. Unlike window.print(), this guarantees
// exactly one page regardless of content length (no CSS page-break behavior to
// fight), and produces a real downloaded file with no browser print header/footer.
// ─────────────────────────────────────────────────────────────────────────────
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

/**
 * Renders `element` to a single A4 page PDF and downloads it as `filename`.
 * The whole element is captured as one image and scaled to fit within the page
 * (preserving aspect ratio) — so however tall the ticket's content is, it always
 * lands on exactly one page instead of spilling a signature block onto a second.
 */
export async function downloadElementAsSinglePagePdf(element, filename) {
  if (!element) throw new Error('No element to render');

  await waitForImages(element);

  const canvas = await html2canvas(element, {
    scale: 2, // render at 2x for crisp text once scaled into the PDF
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const canvasRatio = canvas.width / canvas.height;
  let renderWidth  = pageWidth;
  let renderHeight = pageWidth / canvasRatio;
  if (renderHeight > pageHeight) {
    renderHeight = pageHeight;
    renderWidth  = pageHeight * canvasRatio;
  }
  const x = (pageWidth  - renderWidth)  / 2;
  const y = (pageHeight - renderHeight) / 2;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderWidth, renderHeight);
  pdf.save(filename);
}
