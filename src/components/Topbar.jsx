import { useState, useRef, useEffect } from 'react';
import { useCVStore } from '../store/cvStore';
import { exportDocumentJSON, importDocumentJSON } from '../utils/exportJSON';
import {
  EditIcon,
  UndoIcon,
  RedoIcon,
  PlusIcon,
  MinusIcon,
  DownloadIcon,
  ImportIcon,
  SaveIcon,
  PageIcon,
} from './Icons';

export default function Topbar({ editing, onToggleEditing, onExportPDF, exporting, pageCount, zoom, onZoomChange }) {
  const undo = useCVStore((s) => s.undo);
  const redo = useCVStore((s) => s.redo);
  const past = useCVStore((s) => s.past);
  const future = useCVStore((s) => s.future);
  const cv = useCVStore((s) => s.cv);
  const theme = useCVStore((s) => s.theme);
  const loadDocument = useCVStore((s) => s.loadDocument);
  const resetToDefault = useCVStore((s) => s.resetToDefault);
  const lastSavedAt = useCVStore((s) => s.lastSavedAt);
  const fileInputRef = useRef(null);
  const [statusLabel, setStatusLabel] = useState('');

  useEffect(() => {
    if (!lastSavedAt) return;
    setStatusLabel('Saved just now');
    const t = setTimeout(() => setStatusLabel('Saved to this browser'), 1500);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  // Keyboard shortcuts: Cmd/Ctrl+Z to undo, Shift+Cmd/Ctrl+Z or Cmd/Ctrl+Y to redo.
  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const tag = document.activeElement?.tagName;
      const isEditingText = document.activeElement?.isContentEditable || tag === 'TEXTAREA' || tag === 'INPUT';
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isEditingText) return; // let native undo work inside text fields
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        if (isEditingText) return;
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { cv: importedCV, theme: importedTheme } = await importDocumentJSON(file);
      loadDocument(importedCV, importedTheme);
    } catch (err) {
      alert(err.message || 'Could not import this file.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="topbar-mark">CV</span>
        CV Editor
      </div>

      <button className={`btn ${editing ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleEditing}>
        <EditIcon />
        {editing ? 'Editing' : 'Preview'}
      </button>

      <div className="topbar-divider" />

      <button className="btn btn-icon btn-ghost" title="Undo (Ctrl/Cmd+Z)" onClick={undo} disabled={past.length === 0}>
        <UndoIcon />
      </button>
      <button className="btn btn-icon btn-ghost" title="Redo (Ctrl/Cmd+Shift+Z)" onClick={redo} disabled={future.length === 0}>
        <RedoIcon />
      </button>

      <div className="topbar-divider" />

      <div className="zoom-control">
        <button className="icon-btn" title="Zoom out" onClick={() => onZoomChange(Math.max(0.4, zoom - 0.1))}>
          <MinusIcon />
        </button>
        <button className="zoom-value" title="Reset zoom to 100%" onClick={() => onZoomChange(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="icon-btn" title="Zoom in" onClick={() => onZoomChange(Math.min(1.5, zoom + 0.1))}>
          <PlusIcon />
        </button>
      </div>

      <div className="topbar-divider" />

      <span className="page-count-badge" title="Number of pages the document currently paginates to">
        <PageIcon />
        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
      </span>

      <span className="topbar-status">{statusLabel}</span>

      <div className="topbar-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} title="Import a previously saved .json document">
          <ImportIcon /> Import JSON
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => exportDocumentJSON(cv, theme)}
          title="Save your editable document as JSON, so you can re-import and keep editing later"
        >
          <SaveIcon /> Save JSON
        </button>
        <button
          className="btn btn-ghost btn-sm btn-danger"
          onClick={() => {
            if (confirm('Reset the document back to the default sample CV? This cannot be undone by pressing Undo once loaded.')) {
              resetToDefault();
            }
          }}
        >
          Reset
        </button>
        <button
          className="btn btn-accent"
          onClick={onExportPDF}
          disabled={exporting}
          title="Opens your browser's print dialog with the CV pre-loaded — choose &quot;Save as PDF&quot; for a real, selectable-text PDF"
        >
          <DownloadIcon /> {exporting ? 'Preparing…' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}
