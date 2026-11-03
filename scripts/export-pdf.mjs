// Headless PDF export, for use from the command line (or by Claude).
//
//   npm run export-pdf [-- <output.pdf>]
//
// Starts the Vite dev server, opens the editor in headless Chromium, clicks
// the real "Export PDF" button and saves the print window it opens. This
// reuses src/utils/exportPDF.js unchanged, so the file matches a manual
// export. The browser starts with empty localStorage, so the CV is the
// default one (src/data/myCV.local.js when present), not your autosave.
//
// Headless Chromium ignores window.print(), so instead of the print dialog
// we call page.pdf() on the popup. `preferCSSPageSize` makes it honour the
// `@page { size: A4 }` rule in exportPDF.js.

import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const out = path.resolve(process.argv[2] ?? 'cv.pdf');

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];

let browser;
try {
  // Playwright's own Chromium if installed (npx playwright install chromium),
  // otherwise the Edge that ships with Windows.
  browser = await chromium.launch().catch(() => chromium.launch({ channel: 'msedge' }));
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (err) => console.error('page error:', err.message));
  page.on('dialog', (d) => {
    console.error('dialog:', d.message());
    d.dismiss();
  });
  await page.goto(url);
  await page.waitForSelector('.cv-page');

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Export PDF' }).click(),
  ]);
  // exportPDF.js writes the real content into the popup, then calls print().
  await popup.waitForSelector('.cv-page-stack');
  await popup.evaluate(() => document.fonts.ready);

  await popup.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  console.log(`Saved ${out}`);
} finally {
  await browser?.close();
  await server.close();
}
