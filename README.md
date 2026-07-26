# CV Editor

A structured CV / resume editor and PDF exporter built with React + Vite.

Content is editable, layout isn't: reorder, add, duplicate, and remove sections freely, and
restyle the whole document (fonts, spacing, colors, alignment) from one panel — but nothing
can be dragged a few pixels out of place. No backend, no accounts; everything runs in the
browser.

## Features

- Click-to-edit text anywhere in the document
- Section types: text block, entry list (jobs/education/awards/projects), skill list, label
  list — each type renders consistently wherever it's used
- Drag to reorder sections within or between columns
- One panel controls font, sizing, spacing, margins, column widths, rules, bullets, and
  colors for the entire document
- Full undo/redo (toolbar or Ctrl/Cmd+Z)
- Autosaves to local storage
- Export to PDF, or save/load the document as JSON

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`). It starts blank — fill it
in, or use **Import JSON** to load a `.json` file saved earlier with **Save JSON**.

```bash
npm run build
npm run preview
```

## Using your own CV as the default

`src/data/defaultCV.js` is a blank placeholder. To have your own CV load by default instead
(e.g. on your own machine or fork), copy it to `src/data/myCV.local.js` and fill in your
details, keeping the same `createDefaultCV()` export. That file is gitignored, so it stays
local — `defaultCV.js` picks it up automatically when present and falls back to the blank
template otherwise.

## Project structure

```
src/
  data/            CV/theme defaults and the section-type schema
  store/           Zustand store — cv + theme state, undo/redo history
  components/       CVDocument, panels, toolbar, shared icons
    sections/        Per-section-type renderers
  utils/           Pagination, PDF export, JSON import/export, theme -> CSS
  styles/          App chrome and the CV document's own stylesheet
```

## Extending it

- New section type: add it to `sectionTypeDefs` in `src/data/sectionTypes.js`, add a
  renderer under `src/components/sections/`, and register it in `SectionBlock.jsx`
- New style control: add a token to `createDefaultTheme()`, map it in
  `themeToCSSVars.js`, consume it in `cv-document.css`, add a control in `StylePanel.jsx`

## Deploying

Static, client-only build — works on GitHub Pages, Netlify, Vercel, or any static host:

```bash
npm run build   # outputs to dist/
```

## Tech stack

React 19, Vite, Zustand, @dnd-kit, html2canvas + jsPDF, nanoid.
