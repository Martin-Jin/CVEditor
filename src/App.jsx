import { useState, useRef, useCallback } from 'react';
import Topbar from './components/Topbar';
import SectionsPanel from './components/SectionsPanel';
import StylePanel from './components/StylePanel';
import CVDocument from './components/CVDocument';
import { useCVStore } from './store/cvStore';
import { exportCVToPDF } from './utils/exportPDF';
import { InfoIcon, CloseIcon } from './components/Icons';
import './styles/app.css';
import './styles/cv-document.css';

export default function App() {
  const cv = useCVStore((s) => s.cv);
  const theme = useCVStore((s) => s.theme);
  const [editing, setEditing] = useState(true);
  const [zoom, setZoom] = useState(0.9);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [hintDismissed, setHintDismissed] = useState(false);
  const stackRef = useRef(null);
  // Tracks whether CVDocument's pagination currently has a recompute
  // in flight (debounced after an edit, or waiting on web fonts). Kept
  // in a ref rather than state since export only needs to read the
  // latest value at click-time, not re-render on every change.
  const pendingRef = useRef(false);

  const handleExportPDF = useCallback(async () => {
    if (!stackRef.current) return;
    setExporting(true);
    // Export reads the real, paginated page-box DOM (see exportPDF.js,
    // which clones `:scope > .cv-page` children of the stack node) — that
    // structure only exists in Preview. Editing mode renders one
    // continuous flowing column instead (see CVDocument.jsx), so if the
    // person clicks Export while still editing, we need to switch to
    // Preview first, let it render, export from that, then switch back
    // to however they had it — otherwise export would clone the
    // continuous view's single unpaginated container instead of the
    // real per-page breakdown.
    const wasEditing = editing;
    if (wasEditing) setEditing(false);
    try {
      // If pagination is mid-recompute (e.g. the person clicked Export
      // right after typing, before the debounce/font-load settle), wait
      // for it to finish rather than reading the page DOM immediately —
      // otherwise export can clone a stale or in-progress layout that
      // doesn't match what settles into view a moment later, which is
      // exactly what made the exported PDF disagree with the preview.
      const waitForSettled = async () => {
        const start = Date.now();
        // Also give React a chance to actually commit the Preview-mode
        // render (and, if we just switched modes, for that render's own
        // pagination effect to fire and mark itself pending) before we
        // start polling — otherwise a same-tick check could see stale
        // "not pending" state left over from edit mode and export one
        // frame too early.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        while (pendingRef.current && Date.now() - start < 2000) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      };
      await waitForSettled();

      const filename = (cv.header.name || 'cv').trim().replace(/\s+/g, '_').toLowerCase();
      await exportCVToPDF(stackRef.current, filename);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Something went wrong exporting the PDF. Please try again.');
    } finally {
      setExporting(false);
      if (wasEditing) setEditing(true);
    }
  }, [cv.header.name, editing]);

  const handlePagesChange = useCallback((pages, pending) => {
    pendingRef.current = !!pending;
    setPageCount((prev) => (prev === pages.length ? prev : pages.length));
  }, []);

  return (
    <div className="app-shell">
      <Topbar
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
        onExportPDF={handleExportPDF}
        exporting={exporting}
        pageCount={pageCount}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      <div className="app-body">
        <SectionsPanel selectedSectionId={selectedSectionId} onSelectSection={setSelectedSectionId} />

        <main
          className="stage"
          onMouseDown={(e) => {
            // Clicking anywhere in the stage that ISN'T inside a section
            // (or its controls) deactivates the currently-active section,
            // collapsing it back to its compact/no-empty-rows appearance.
            // Uses mousedown rather than click so this fires before the
            // click that focuses a new field, without racing it.
            if (!e.target.closest('[data-section-id]') && !e.target.closest('.side-panel')) {
              setSelectedSectionId(null);
            }
          }}
        >
          {editing && !hintDismissed && (
            <div className="hint-banner" style={{ maxWidth: '595pt', width: '100%' }}>
              <InfoIcon />
              <span>
                Click into any section to edit it — empty fields and controls only show up for the section
                you're actively editing. In edit mode the document scrolls continuously; switch to{' '}
                <strong>Preview</strong> to see real page breaks, and use the <strong>Style</strong> panel's Pages
                section to allow up to 2 pages. Export produces a real, selectable-text PDF via your browser's print
                dialog; choose <strong>Save as PDF</strong> as the destination.
              </span>
              <button
                className="hint-banner-close"
                title="Dismiss"
                onClick={() => setHintDismissed(true)}
              >
                <CloseIcon />
              </button>
            </div>
          )}
          <div className="page-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <CVDocument
              ref={stackRef}
              cv={cv}
              theme={theme}
              editing={editing}
              onPagesChange={handlePagesChange}
              activeSectionId={selectedSectionId}
              onActivateSection={setSelectedSectionId}
            />
          </div>
        </main>

        <StylePanel />
      </div>
    </div>
  );
}
