// Central application state: CV content, theme, section ordering, and an
// undo/redo history stack. All mutating actions funnel through `commit()`
// so every change is automatically undoable — components never mutate
// state directly.

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { createDefaultCV } from '../data/defaultCV';
import { createDefaultTheme } from '../data/defaultTheme';
import { sectionTypeDefs } from '../data/sectionTypes';

const HISTORY_LIMIT = 100;
const AUTOSAVE_KEY = 'cv-editor-autosave-v1';
// Separate from the autosave key: this stores a *theme-only* override that
// becomes the starting point for new documents (via "Save current style as
// default" in the Style panel), independent of any particular CV content.
const DEFAULT_THEME_KEY = 'cv-editor-default-theme-v1';

function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.cv || !parsed.theme) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadDefaultThemeOverride() {
  try {
    const raw = localStorage.getItem(DEFAULT_THEME_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** The theme used whenever a *new* default document is created (initial load with
 * no autosave, or Reset). Falls back to the built-in theme if nothing was saved. */
function getDefaultTheme() {
  const override = loadDefaultThemeOverride();
  return override ? { ...createDefaultTheme(), ...override } : createDefaultTheme();
}

function snapshot(state) {
  // Deep clone via structuredClone (supported in all modern browsers/Vite dev env)
  return {
    cv: structuredClone(state.cv),
    theme: structuredClone(state.theme),
  };
}

// Merge the saved theme over the built-in defaults rather than trusting it
// outright: a theme autosaved by an older version of this app can be missing
// fields that got added since (e.g. a new Slider control), which would
// otherwise reach components as `undefined` and crash them (e.g. Slider's
// `value.toFixed(2)`).
const autosaved = loadAutosave();
const initial = autosaved
  ? { cv: autosaved.cv, theme: { ...createDefaultTheme(), ...autosaved.theme } }
  : { cv: createDefaultCV(), theme: getDefaultTheme() };

export const useCVStore = create((set, get) => ({
  cv: initial.cv,
  theme: initial.theme,
  past: [],
  future: [],
  lastSavedAt: null,

  // ---- History plumbing -------------------------------------------------

  /** Push current state to history, then apply `updater(draft)` and commit. */
  commit(mutate, { theme = false } = {}) {
    const state = get();
    const before = snapshot(state);
    const draft = theme ? structuredClone(state.theme) : structuredClone(state.cv);
    mutate(draft);
    const past = [...state.past, before].slice(-HISTORY_LIMIT);
    set(theme ? { theme: draft, past, future: [] } : { cv: draft, past, future: [] });
    get()._autosave();
  },

  undo() {
    const state = get();
    const { past, future } = state;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const currentSnapshot = snapshot(state);
    set({
      cv: previous.cv,
      theme: previous.theme,
      past: past.slice(0, -1),
      future: [currentSnapshot, ...future].slice(0, HISTORY_LIMIT),
    });
    get()._autosave();
  },

  redo() {
    const state = get();
    const { past, future } = state;
    if (future.length === 0) return;
    const next = future[0];
    const currentSnapshot = snapshot(state);
    set({
      cv: next.cv,
      theme: next.theme,
      past: [...past, currentSnapshot].slice(-HISTORY_LIMIT),
      future: future.slice(1),
    });
    get()._autosave();
  },

  _autosave() {
    try {
      const { cv, theme } = get();
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ cv, theme }));
      set({ lastSavedAt: Date.now() });
    } catch {
      // localStorage may be unavailable (e.g. private mode) — fail silently.
    }
  },

  resetToDefault() {
    const before = snapshot(get());
    const cv = createDefaultCV();
    const theme = getDefaultTheme();
    set({ cv, theme, past: [...get().past, before].slice(-HISTORY_LIMIT), future: [] });
    get()._autosave();
  },

  /**
   * Persists the *current* theme as the new starting point for future
   * documents (fresh loads with no autosave, and Reset). Does not touch
   * document content and does not affect undo/redo history, since it isn't
   * a document mutation — it's a preference.
   */
  saveThemeAsDefault() {
    try {
      const { theme } = get();
      localStorage.setItem(DEFAULT_THEME_KEY, JSON.stringify(theme));
      return true;
    } catch {
      return false;
    }
  },

  // ---- Header -------------------------------------------------------------

  updateHeader(patch) {
    get().commit((draft) => {
      Object.assign(draft.header, patch);
    });
  },

  updateHeaderContact(list, contactId, patch) {
    get().commit((draft) => {
      const arr = draft.header[list];
      const idx = arr.findIndex((c) => c.id === contactId);
      if (idx !== -1) Object.assign(arr[idx], patch);
    });
  },

  addHeaderContact(list) {
    get().commit((draft) => {
      draft.header[list].push({ id: nanoid(8), label: 'Label', value: 'value' });
    });
  },

  removeHeaderContact(list, contactId) {
    get().commit((draft) => {
      draft.header[list] = draft.header[list].filter((c) => c.id !== contactId);
    });
  },

  // ---- Section-level actions ----------------------------------------------

  updateSectionTitle(sectionId, title) {
    get().commit((draft) => {
      draft.sections[sectionId].title = title;
    });
  },

  updateSectionField(sectionId, field, value) {
    get().commit((draft) => {
      draft.sections[sectionId][field] = value;
    });
  },

  addSection(type, column = 'leftColumn') {
    get().commit((draft) => {
      const def = sectionTypeDefs[type];
      const id = `section_${nanoid(6)}`;
      draft.sections[id] = { id, type, title: def.defaultTitle, ...structuredClone(def.emptyContent) };
      draft.layout[column].push(id);
    });
  },

  duplicateSection(sectionId) {
    get().commit((draft) => {
      const original = draft.sections[sectionId];
      const clone = structuredClone(original);
      const newId = `section_${nanoid(6)}`;
      clone.id = newId;
      clone.title = `${clone.title} (copy)`;
      if (clone.items) {
        clone.items = clone.items.map((it) => ({ ...it, id: nanoid(8) }));
      }
      draft.sections[newId] = clone;
      for (const col of ['leftColumn', 'rightColumn']) {
        const idx = draft.layout[col].indexOf(sectionId);
        if (idx !== -1) draft.layout[col].splice(idx + 1, 0, newId);
      }
    });
  },

  removeSection(sectionId) {
    get().commit((draft) => {
      delete draft.sections[sectionId];
      for (const col of ['leftColumn', 'rightColumn']) {
        draft.layout[col] = draft.layout[col].filter((id) => id !== sectionId);
      }
    });
  },

  /** Move a section within/between the two ordered column lists. */
  moveSection(sectionId, targetColumn, targetIndex) {
    get().commit((draft) => {
      for (const col of ['leftColumn', 'rightColumn']) {
        draft.layout[col] = draft.layout[col].filter((id) => id !== sectionId);
      }
      draft.layout[targetColumn].splice(targetIndex, 0, sectionId);
    });
  },

  moveSectionStep(sectionId, direction) {
    get().commit((draft) => {
      for (const col of ['leftColumn', 'rightColumn']) {
        const arr = draft.layout[col];
        const idx = arr.indexOf(sectionId);
        if (idx === -1) continue;
        const target = idx + direction;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        return;
      }
    });
  },

  // ---- Entry-level actions (for entry-list / skill-list / label-list) -----

  addEntry(sectionId) {
    get().commit((draft) => {
      const section = draft.sections[sectionId];
      const def = sectionTypeDefs[section.type];
      section.items.push({ ...structuredClone(def.emptyItem), id: nanoid(8) });
    });
  },

  updateEntry(sectionId, entryId, patch) {
    get().commit((draft) => {
      const section = draft.sections[sectionId];
      const idx = section.items.findIndex((i) => i.id === entryId);
      if (idx !== -1) Object.assign(section.items[idx], patch);
    });
  },

  removeEntry(sectionId, entryId) {
    get().commit((draft) => {
      const section = draft.sections[sectionId];
      section.items = section.items.filter((i) => i.id !== entryId);
    });
  },

  duplicateEntry(sectionId, entryId) {
    get().commit((draft) => {
      const section = draft.sections[sectionId];
      const idx = section.items.findIndex((i) => i.id === entryId);
      if (idx === -1) return;
      const clone = { ...structuredClone(section.items[idx]), id: nanoid(8) };
      section.items.splice(idx + 1, 0, clone);
    });
  },

  moveEntryStep(sectionId, entryId, direction) {
    get().commit((draft) => {
      const section = draft.sections[sectionId];
      const idx = section.items.findIndex((i) => i.id === entryId);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= section.items.length) return;
      [section.items[idx], section.items[target]] = [section.items[target], section.items[idx]];
    });
  },

  // ---- Bullets within an entry ---------------------------------------------

  addBullet(sectionId, entryId) {
    get().commit((draft) => {
      const entry = draft.sections[sectionId].items.find((i) => i.id === entryId);
      entry.bullets.push('New bullet point');
    });
  },

  updateBullet(sectionId, entryId, bulletIndex, text) {
    get().commit((draft) => {
      const entry = draft.sections[sectionId].items.find((i) => i.id === entryId);
      entry.bullets[bulletIndex] = text;
    });
  },

  removeBullet(sectionId, entryId, bulletIndex) {
    get().commit((draft) => {
      const entry = draft.sections[sectionId].items.find((i) => i.id === entryId);
      entry.bullets.splice(bulletIndex, 1);
    });
  },

  moveBulletStep(sectionId, entryId, bulletIndex, direction) {
    get().commit((draft) => {
      const entry = draft.sections[sectionId].items.find((i) => i.id === entryId);
      const target = bulletIndex + direction;
      if (target < 0 || target >= entry.bullets.length) return;
      [entry.bullets[bulletIndex], entry.bullets[target]] = [entry.bullets[target], entry.bullets[bulletIndex]];
    });
  },

  // ---- Theme ----------------------------------------------------------------

  updateTheme(patch) {
    get().commit((draft) => {
      Object.assign(draft, patch);
    }, { theme: true });
  },

  /**
   * Sets a manual page-break override for `pageNumber` and pushes ONE
   * undo-history entry. Use this on drag-END (mouseup/touchend/pointerup).
   */
  setManualBreak(pageNumber, heightPt) {
    get().commit((draft) => {
      draft.manualBreaks = { ...(draft.manualBreaks || {}), [pageNumber]: heightPt };
    }, { theme: true });
  },

  /**
   * Removes the manual override for `pageNumber`, reverting that page to
   * fully automatic pagination. Pushes one undo-history entry.
   */
  clearManualBreak(pageNumber) {
    get().commit((draft) => {
      if (!draft.manualBreaks) return;
      const next = { ...draft.manualBreaks };
      delete next[pageNumber];
      draft.manualBreaks = next;
    }, { theme: true });
  },

  // ---- Import / replace whole document --------------------------------------

  loadDocument(cv, theme) {
    const before = snapshot(get());
    set({
      cv,
      theme,
      past: [...get().past, before].slice(-HISTORY_LIMIT),
      future: [],
    });
    get()._autosave();
  },
}));