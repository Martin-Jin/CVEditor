// PDF export with REAL, SELECTABLE/HIGHLIGHTABLE text.
//
// Earlier versions rasterized the page with html2canvas (or routed through
// jsPDF's html() helper, which — despite appearances — ALSO rasterizes via
// html2canvas internally). Either way the "text" in the resulting PDF is
// just pixels: nothing can be selected, searched, copied, or read by a
// screen reader. There is no pure-JS, purely-client-side library that
// re-implements real text layout for arbitrary CSS; the only client-side
// path to genuine PDF text is the browser's own print engine, which DOES
// do real text layout and, when the target is "Save as PDF", DOES embed
// real selectable text objects.
//
// So export works by opening the already-rendered page-stack in a new
// window scoped to just the CV (no editor chrome), applying print-exact
// CSS (each `.cv-page` becomes an actual paged-media page via
// `break-after: page`), and invoking `window.print()`. The person picks
// "Save as PDF" in the browser's print dialog. This guarantees the PDF
// text is real text, because it's produced by the same engine that prints
// any other web page.
//
// IMPORTANT: `window.open()` must be the very first thing this function
// does, called synchronously with no `await` before it. Browsers only
// allow a script to open a new window/tab without it being treated (and
// usually silently blocked) as a popup when the call happens directly
// within the synchronous part of a user-triggered event handler — the
// moment you `await` something first, that direct association is lost.
// An earlier version awaited `document.fonts.ready` before opening the
// window, which is why export appeared to do nothing: the popup was
// blocked, so the window that opened (if any) stayed blank and nothing
// was ever written into it or printed.

/**
 * @param {HTMLElement} pageStackNode - the .cv-page-stack element rendered
 *   by CVDocument (already contains one real, correctly-margined .cv-page
 *   per page — pagination has already decided what goes where).
 * @param {string} filename - suggested filename (shown as the print job
 *   title on most browsers/OSes, which pre-fills the "Save as PDF" name).
 */
export async function exportCVToPDF(pageStackNode, filename = 'cv') {
  if (!pageStackNode) throw new Error('No CV node to export');

  // Open the window FIRST, synchronously, before any `await` — see note
  // above. This is what actually fixes the "blank screen, nothing
  // happens" bug: previously `await document.fonts.ready` ran first,
  // which broke the browser's link between this call and the user's
  // click, so the popup got blocked.
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    throw new Error('Your browser blocked the print/export window. Please allow pop-ups for this site and try again.');
  }

  // Show a friendly placeholder immediately so the window isn't just a
  // blank white rectangle while fonts/styles/content are being prepared.
  // This is the ONLY document.open()/write()/close() cycle we perform on
  // this window. Previously a second open()/write()/close() cycle ran
  // after `await document.fonts.ready` to swap in the real content —
  // but re-opening a document that was already closed, after an await has
  // let the event loop turn, is unreliable: some browsers (and especially
  // embedded browser shells) silently ignore or drop the second write,
  // leaving the tab stuck blank or on the placeholder forever, which is
  // exactly the "blank about:blank tab" symptom. Instead we build the
  // complete final HTML in memory first, and perform a single write.
  printWindow.document.open();
  printWindow.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preparing your PDF…</title></head>' +
      '<body style="margin:0;padding:3rem;font-family:-apple-system,Segoe UI,sans-serif;color:#666;">' +
      'Preparing your PDF…' +
      '</body></html>'
  );
  printWindow.document.close();

  // Wait for THIS document's (the opener's, i.e. the live editor's) fonts
  // to be ready before reading the page DOM below. Pagination re-settles
  // asynchronously once fonts finish loading (see paginate.js) — if
  // export read the DOM before that re-settle happened, it would clone
  // whatever page breaks were computed against fallback-font metrics,
  // which is exactly what made export disagree with the on-screen
  // preview and clip content that the (correctly-measured) preview
  // would have flowed onto a later page.
  await document.fonts.ready;

  const pageNodes = Array.from(pageStackNode.querySelectorAll(':scope > .cv-page'));
  if (pageNodes.length === 0) {
    printWindow.close();
    throw new Error('No pages to export');
  }

  const styleTags = collectStyleSheets();
  const pagesHtml = pageNodes
    .map((node) => {
      const clone = node.cloneNode(true);
      clone.classList.remove('editing');
      clone.classList.remove('has-overflow');
      clone.querySelectorAll('.no-print').forEach((el) => el.remove());
      return clone.outerHTML;
    })
    .join('\n');

  const finalHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(filename)}</title>
${styleTags}
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cv-page-stack { display: block; }
  .cv-page {
    box-shadow: none !important;
    margin: 0 !important;
    overflow: visible !important;
    /* Force out any leftover transform/filter (e.g. from the on-screen
       zoom control, or the editor's page-wrap scaling). A transformed or
       filtered element is composited on its own layer by most browser
       engines — during print, some engines rasterize that layer as a
       bitmap rather than laying out real text objects inside it, which
       is what makes the resulting PDF text unselectable/uncopyable
       ("acts like an image") even though this document itself is plain
       HTML/CSS. Printing a completely untransformed subtree keeps the
       browser on its normal text-layout path. */
    transform: none !important;
    filter: none !important;
  }
  .cv-page + .cv-page { break-before: page; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
<div class="cv-page-stack">
${pagesHtml}
</div>
</body>
</html>`;

  // Guard against the window having been closed by the person while we
  // were awaiting fonts above.
  if (printWindow.closed) {
    throw new Error('The export window was closed before the PDF could be prepared. Please try again.');
  }

  printWindow.document.open();
  printWindow.document.write(finalHtml);
  printWindow.document.close();

  await Promise.race([
    waitForStylesAndFonts(printWindow),
    new Promise((resolve) => setTimeout(resolve, 3000)), // safety timeout: never block export forever on a stylesheet that never settles
  ]);

  if (printWindow.closed) {
    throw new Error('The export window was closed before printing could start. Please try again.');
  }

  printWindow.focus();
  printWindow.print();
}

/** Copies every <style> and <link rel="stylesheet"> from the current document into the print window, resolving hrefs to absolute URLs so they still load in the popup's separate document context. */
function collectStyleSheets() {
  const nodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
  return nodes
    .map((node) => {
      if (node.tagName === 'LINK') {
        const absoluteHref = new URL(node.getAttribute('href'), document.baseURI).href;
        return `<link rel="stylesheet" href="${absoluteHref}">`;
      }
      return node.outerHTML;
    })
    .join('\n');
}

/** Resolves once every <link rel="stylesheet"> in the popup has fired load/error, and fonts are ready. */
function waitForStylesAndFonts(win) {
  const linkNodes = Array.from(win.document.querySelectorAll('link[rel="stylesheet"]'));
  const linkLoads = linkNodes.map(
    (link) =>
      new Promise((resolve) => {
        if (link.sheet) return resolve(); // already loaded (e.g. from cache)
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
      })
  );

  const fontsReady = win.document.fonts ? win.document.fonts.ready.catch(() => {}) : Promise.resolve();

  return Promise.all([...linkLoads, fontsReady]);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}