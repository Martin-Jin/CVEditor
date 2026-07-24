import { createDefaultTheme } from '../data/defaultTheme';

/** Download the current cv + theme state as a .json file the user can re-import later. */
export function exportDocumentJSON(cv, theme, filename = 'cv-document') {
  const payload = JSON.stringify({ cv, theme, savedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse a previously-exported JSON file back into { cv, theme }. Throws on invalid shape. */
export async function importDocumentJSON(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed.cv || !parsed.theme) {
    throw new Error('This file does not look like a CV Editor export.');
  }
  // A file exported by an older version of this app can be missing theme
  // fields added since — merge over the current defaults so components
  // never receive `undefined` for a field they expect (see cvStore.js's
  // same treatment of the localStorage autosave).
  return { cv: parsed.cv, theme: { ...createDefaultTheme(), ...parsed.theme } };
}
